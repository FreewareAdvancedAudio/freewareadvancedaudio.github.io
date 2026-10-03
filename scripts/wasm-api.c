/*
 * Browser converter adapter. JavaScript only sees an opaque session and scalars;
 * FAAC structs, enum values, MP4 state and uint64_t calls stay in C.
 * Licensed under AGPL-3.0-or-later, like the browser converter worker.
 */
#include <stdint.h>
#include <stdlib.h>
#include <stdio.h>
#include <faac.h>
#include "mp4write.h"
#include "input.h"

#define WASM_ERR_MP4 (-7)

typedef struct {
    faac_encoder *encoder;
    faac_encoder_info info;
    uint32_t channels;
    int16_t *input;
    uint8_t *output;
    uint64_t input_samples;
    uint64_t output_samples;
    uint64_t container_position;
    uint32_t rate_divisor;
    int mp4_open;
    int finished;
    char encoder_name[128];
} wasm_converter;

/* Match encode_engine.c: HE-AAC MP4 uses the core (half-output) rate.
 * Round scalar metadata in that domain and derive frame durations from the
 * running position so rounding cannot accumulate across frames. */
static uint64_t container_samples(const wasm_converter *session, uint64_t samples)
{
    return (samples + session->rate_divisor / 2) / session->rate_divisor;
}

const char *wasm_converter_version(void)
{
    faac_library_info info = { .struct_size = sizeof(info) };
    return faac_get_library_info(&info) == FAAC_OK ? info.version : "unknown";
}

const char *wasm_converter_error(int status)
{
    return status == WASM_ERR_MP4 ? "Could not write M4A output" : faac_strerror(status);
}

void wasm_converter_close(wasm_converter *session)
{
    if (!session)
        return;
    if (session->mp4_open)
        mp4_close();
    faac_encoder_close(&session->encoder);
    free(session->input);
    free(session->output);
    free(session);
}

wasm_converter *wasm_converter_open(uint32_t sample_rate, uint32_t channels,
                                    uint32_t bitrate, int object_type, int32_t *status)
{
    faac_params params;
    const uint8_t *asc;
    uint32_t asc_size;
    if (!status)
        return NULL;
    wasm_converter *session = calloc(1, sizeof(*session));
    if (!session) {
        *status = FAAC_ERR_NO_MEMORY;
        return NULL;
    }
    *status = faac_params_init(&params, sizeof(params));
    if (*status != FAAC_OK)
        goto fail;
    params.sample_rate = sample_rate;
    params.num_channels = channels;
    params.bit_rate = channels ? bitrate / channels : 0;
    params.use_lfe = channels >= 6;
    if (object_type == FAAC_OBJ_HE_AAC_V1) {
        params.object_type = FAAC_OBJ_HE_AAC_V1;
    } else if (object_type == FAAC_OBJ_LOW) {
        params.object_type = FAAC_OBJ_LOW;
    } else {
        params.object_type = FAAC_OBJ_AUTO;
    }
    params.output_format = FAAC_STREAM_RAW;
    params.input_format = FAAC_INPUT_16BIT;
    faac_library_info library = { .struct_size = sizeof(library) };
    *status = faac_get_library_info(&library);
    if (*status != FAAC_OK)
        goto fail;
    if (!channels || channels > library.max_channels) {
        *status = FAAC_ERR_INVALID_ARGUMENT;
        goto fail;
    }
    /* Web Audio speaker order matches the frontend's default WAV order. */
    int *channel_map = mk_chan_map((uint16_t)channels, 3, 4);
    if (channels >= 3 && !channel_map) {
        *status = FAAC_ERR_NO_MEMORY;
        goto fail;
    }
    params.channel_map = channel_map;
    params.channel_map_count = channel_map ? channels : 0;
    *status = faac_encoder_open(&params, &session->encoder);
    free(channel_map);
    if (*status != FAAC_OK)
        goto fail;
    session->info.struct_size = sizeof(session->info);
    *status = faac_encoder_get_info(session->encoder, &session->info);
    if (*status != FAAC_OK)
        goto fail;
    session->channels = channels;
    session->rate_divisor = session->info.object_type == FAAC_OBJ_HE_AAC_V1 ? 2 : 1;
    session->input = malloc((size_t)session->info.frame_samples * channels * sizeof(int16_t));
    session->output = malloc(session->info.max_output_bytes);
    if (!session->input || !session->output) {
        *status = FAAC_ERR_NO_MEMORY;
        goto fail;
    }
    *status = faac_encoder_asc(session->encoder, &asc, &asc_size);
    if (*status != FAAC_OK)
        goto fail;
    if (mp4_open("output.m4a", true) != 0) {
        *status = WASM_ERR_MP4;
        goto fail;
    }
    session->mp4_open = 1;
    mp4_set_format((uint32_t)container_samples(session, session->info.sample_rate), channels, 16);
    mp4_set_decoder_config(asc, asc_size);
    snprintf(session->encoder_name, sizeof(session->encoder_name), "FAAC %s", wasm_converter_version());
    mp4_set_encoder(session->encoder_name);
    return session;
fail:
    wasm_converter_close(session);
    return NULL;
}

uint32_t wasm_converter_object_type(const wasm_converter *session)
{
    return session ? session->info.object_type : FAAC_OBJ_AUTO;
}

uint32_t wasm_converter_frame_samples(const wasm_converter *session)
{
    return session ? session->info.frame_samples : 0;
}

int16_t *wasm_converter_input(const wasm_converter *session)
{
    return session ? session->input : NULL;
}

static int encode_frame(wasm_converter *session, uint32_t samples, uint32_t *written)
{
    faac_status status = faac_encoder_encode(session->encoder,
        samples ? session->input : NULL, samples,
        session->output, session->info.max_output_bytes, written);
    if (status != FAAC_OK)
        return status;
    if (*written) {
        session->output_samples += session->info.frame_samples;
        uint64_t position = container_samples(session, session->output_samples);
        uint32_t duration = (uint32_t)(position - session->container_position);
        if (mp4_write_frame(session->output, *written, duration) != 0)
            return WASM_ERR_MP4;
        session->container_position = position;
    }
    return FAAC_OK;
}

int wasm_converter_encode(wasm_converter *session, uint32_t samples)
{
    if (!session || session->finished || !samples || samples % session->channels)
        return FAAC_ERR_INVALID_ARGUMENT;
    if (samples > session->info.frame_samples * session->channels)
        return FAAC_ERR_INPUT_OVERFLOW;
    uint32_t written;
    int status = encode_frame(session, samples, &written);
    if (status == FAAC_OK)
        session->input_samples += samples / session->channels;
    return status;
}

int wasm_converter_finish(wasm_converter *session)
{
    if (!session || session->finished)
        return FAAC_ERR_INVALID_ARGUMENT;
    uint32_t written;
    int status;
    do {
        status = encode_frame(session, 0, &written);
        if (status != FAAC_OK)
            return status;
    } while (written);
    uint64_t encoded = session->output_samples;
    uint64_t used = (uint64_t)session->info.encoder_delay + session->input_samples;
    if (encoded < used || encoded - used > UINT32_MAX)
        return FAAC_ERR_INTERNAL;
    mp4_set_gapless((uint32_t)container_samples(session, session->info.encoder_delay),
                    (uint32_t)container_samples(session, encoded - used),
                    container_samples(session, session->input_samples));
    if (mp4_finish() != 0)
        return WASM_ERR_MP4;
    int close_status = mp4_close();
    session->mp4_open = 0;
    session->finished = 1;
    return close_status == 0 ? FAAC_OK : WASM_ERR_MP4;
}
