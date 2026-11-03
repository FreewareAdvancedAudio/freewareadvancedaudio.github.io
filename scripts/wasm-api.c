/*
 * Browser converter adapter. JavaScript only sees an opaque session and scalars;
 * FAAC structs, enum values, MP4 state and uint64_t calls stay in C.
 * Licensed under AGPL-3.0-or-later, like the browser converter worker.
 *
 * Mirrors the frontend's encode_engine.c: automatic rate selection with FAAR
 * resampling, and an encoder tag of "FAAC <version>, <settings>".
 */
#include <stdint.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <faac.h>
#include <faar.h>
#include <faam.h>
#include "mp4write.h"

#define WASM_ERR_MP4 (-7)
#define MAX_CUSTOM_TAGS 32
#define MAX_TAG_BYTES (64 * 1024)
#define MAX_COVER_BYTES (16 * 1024 * 1024)

typedef struct { char *name; char *value; } custom_tag;

typedef struct {
    faac_encoder *encoder;
    faac_encoder_info info;
    faar_resampler *resampler;
    uint32_t channels;
    uint32_t source_rate;
    uint32_t sample_rate;       /* rate the encoder runs at */
    int source_float;           /* JS input buffer holds float instead of int16 */
    void *input;                /* JS writes source-rate chunks here */
    float *rs_in;               /* int16 -> float staging, resampling only */
    float *rs_out;              /* resampled frames waiting for a full encoder frame */
    uint32_t pending;           /* frames in rs_out */
    uint8_t *output;
    uint64_t input_samples;     /* frames fed to the encoder (encoder-rate domain) */
    uint64_t output_samples;
    uint64_t container_position;
    uint32_t rate_divisor;
    uint32_t rate_control;
    int mp4_open;
    int finished;
    char encoder_name[256];
    /* Tags carried over from an M4A source; applied at finish. */
    char *tags[MP4TAG_COUNT];
    uint16_t track, ntracks, disc, ndiscs;
    int compilation;
    uint8_t *cover;
    uint32_t cover_size;
    custom_tag custom[MAX_CUSTOM_TAGS];
    uint32_t custom_count;
} wasm_converter;

/* Match encode_engine.c: HE-AAC codes at half the input rate, so MP4 timing
 * uses that core rate. Round scalar metadata in that domain and derive frame
 * durations from the running position so rounding cannot accumulate. */
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

/* mp4write keeps borrowed pointers and settings in globals that mp4_close()
 * doesn't clear. Reset them so a later session in the same module never reads
 * freed memory or inherits the previous file's tags. */
static void reset_mp4_state(void)
{
    for (int i = 0; i < MP4TAG_COUNT; i++)
        mp4_set_tag((mp4_tag_id_t)i, NULL);
    mp4_set_cover(NULL, 0);
    mp4_set_track(0, 0);
    mp4_set_disc(0, 0);
    mp4_set_compilation(false);
    mp4_set_encoder(NULL);
    mp4_set_decoder_config(NULL, 0);
}

void wasm_converter_close(wasm_converter *session)
{
    if (!session)
        return;
    if (session->mp4_open)
        mp4_close();
    if (session->resampler)
        faar_resampler_close(&session->resampler);
    faac_encoder_close(&session->encoder);
    for (int i = 0; i < MP4TAG_COUNT; i++)
        free(session->tags[i]);
    for (uint32_t i = 0; i < session->custom_count; i++) {
        free(session->custom[i].name);
        free(session->custom[i].value);
    }
    free(session->cover);
    free(session->input);
    free(session->rs_in);
    free(session->rs_out);
    free(session->output);
    free(session);
    reset_mp4_state();
}

/* Same "FAAC <ver>, <settings>" shape the CLI writes to the (c)too atom. */
static void format_encoder_name(wasm_converter *session)
{
    const faac_encoder_info *info = &session->info;
    char *p = session->encoder_name;
    size_t cap = sizeof(session->encoder_name);
    int n = snprintf(p, cap, "FAAC %s", wasm_converter_version());
    if (info->bit_rate == 0)
        n += snprintf(p + n, cap - n, ", VBR quality %u", info->quality);
    else
        n += snprintf(p + n, cap - n, ", %s %ukbps",
                      session->rate_control == FAAC_RC_CBR ? "CBR" : "ABR",
                      (info->bit_rate + 500) / 1000);
    if (session->source_rate != session->sample_rate)
        n += snprintf(p + n, cap - n, ", %uHz->%uHz", session->source_rate, session->sample_rate);
    else
        n += snprintf(p + n, cap - n, ", %uHz", session->sample_rate);
    snprintf(p + n, cap - n, ", cutoff %uHz, %s", info->bandwidth,
             info->object_type == FAAC_OBJ_HE_AAC_V2 ? "HE v2" :
             info->object_type == FAAC_OBJ_HE_AAC_V1 ? "HE v1" : "LC");
}

wasm_converter *wasm_converter_open(uint32_t sample_rate, uint32_t channels,
                                    uint32_t bitrate, int object_type,
                                    int rate_control, uint32_t quant_quality,
                                    int input_format, uint32_t rate_request,
                                    int32_t *status)
{
    faac_params params;
    if (!status)
        return NULL;
    reset_mp4_state();
    wasm_converter *session = calloc(1, sizeof(*session));
    if (!session) {
        *status = FAAC_ERR_NO_MEMORY;
        return NULL;
    }
    *status = faac_params_init(&params, sizeof(params));
    if (*status != FAAC_OK)
        goto fail;
    params.sample_rate = sample_rate;
    params.channels = channels;
    params.bit_rate = rate_control == FAAC_RC_VBR ? 0 : bitrate;
    params.quality = rate_control == FAAC_RC_VBR ? quant_quality : 0;
    params.rate_control = (enum faac_rate_control)rate_control;
    session->rate_control = (uint32_t)params.rate_control;
    if (object_type == FAAC_OBJ_HE_AAC_V1) {
        params.object_type = FAAC_OBJ_HE_AAC_V1;
    } else if (object_type == FAAC_OBJ_LC) {
        params.object_type = FAAC_OBJ_LC;
    } else {
        params.object_type = FAAC_OBJ_AUTO;
    }
    params.stream_format = FAAC_STREAM_RAW;
    session->source_float = input_format == FAAC_INPUT_FLOAT;
    params.input_format = session->source_float ? FAAC_INPUT_FLOAT : FAAC_INPUT_16BIT;
    /* Web Audio speaker order matches the frontend's default WAV order. */
    params.channel_layout = FAAC_LAYOUT_WAV;
    faac_library_info library = { .struct_size = sizeof(library) };
    *status = faac_get_library_info(&library);
    if (*status != FAAC_OK)
        goto fail;
    if (!channels || channels > library.max_channels) {
        *status = FAAC_ERR_INVALID_ARGUMENT;
        goto fail;
    }

    /* Rate selection (--rate auto|keep|hz), after encode_engine.c's rate_auto block, but only where
     * the profile can't change at the new rate: explicit LC, or AUTO above
     * 48 kHz. HE-AAC and AUTO at lower rates keep the source rate, so no probe
     * is needed. Skipped for VBR, which has no per-channel bitrate. */
    session->source_rate = sample_rate;
    uint32_t target_rate = sample_rate > 96000 ? 96000 : sample_rate;
    const uint32_t rate_per_channel = params.bit_rate / channels;
    const int is_lc = object_type == FAAC_OBJ_LC;
    const int auto_high = params.object_type == FAAC_OBJ_AUTO && sample_rate > 48000;
    /* --rate: 0 = auto, 1 = keep the input rate, else an explicit lower rate. */
    if (rate_request > 1) {
        if (rate_request >= sample_rate || rate_request < 7350 || rate_request > 96000) {
            *status = FAAC_ERR_INVALID_ARGUMENT;
            goto fail;
        }
        target_rate = rate_request;
    } else if (rate_request == 0 && rate_per_channel > 0 && (is_lc || auto_high)) {
        const uint32_t lc_48k_bps = 19000;
        const uint32_t lc_44k_bps = 11000;
        if (sample_rate > 48000)
            target_rate = (sample_rate % 44100 == 0) ? 44100 : 48000;
        else if (is_lc && sample_rate > 32000 &&
                 ((sample_rate % 8000 == 0 && rate_per_channel <= lc_48k_bps) ||
                  (sample_rate % 11025 == 0 && rate_per_channel <= lc_44k_bps)))
            target_rate = 32000;
    }
    if (target_rate > 96000)
        target_rate = 96000;
    session->sample_rate = target_rate;
    params.sample_rate = target_rate;

    if (target_rate != sample_rate) {
        faar_config config;
        faar_status rs = faar_config_init(&config, sizeof(config));
        config.in_rate = sample_rate;
        config.out_rate = target_rate;
        config.channels = (uint16_t)channels;
        config.quality = sample_rate > 48000 ? FAAR_QUALITY_HIGH : FAAR_QUALITY_GOOD;
        if (rs == FAAR_OK)
            rs = faar_resampler_open(&config, &session->resampler);
        if (rs != FAAR_OK) {
            *status = FAAC_ERR_INTERNAL;
            goto fail;
        }
        /* The resampler produces float; feed the encoder float. */
        params.input_format = FAAC_INPUT_FLOAT;
    }

    *status = faac_encoder_open(&params, &session->encoder);
    if (*status != FAAC_OK)
        goto fail;
    session->info.struct_size = sizeof(session->info);
    *status = faac_encoder_get_info(session->encoder, &session->info);
    if (*status != FAAC_OK)
        goto fail;
    session->channels = channels;
    session->rate_divisor = session->info.object_type == FAAC_OBJ_HE_AAC_V1 ? 2 : 1;
    size_t frame_cap = (size_t)session->info.frame_samples * channels;
    size_t sample_size = session->source_float ? sizeof(float) : sizeof(int16_t);
    session->input = malloc(frame_cap * sample_size);
    session->output = malloc(session->info.max_output_bytes);
    if (session->resampler) {
        session->rs_in = malloc(frame_cap * sizeof(float));
        session->rs_out = malloc(frame_cap * sizeof(float));
        if (!session->rs_in || !session->rs_out) {
            *status = FAAC_ERR_NO_MEMORY;
            goto fail;
        }
    }
    if (!session->input || !session->output) {
        *status = FAAC_ERR_NO_MEMORY;
        goto fail;
    }
    if (mp4_open("output.m4a", true) != 0) {
        *status = WASM_ERR_MP4;
        goto fail;
    }
    session->mp4_open = 1;
    mp4_set_format((uint32_t)container_samples(session, target_rate), channels, 16);
    mp4_set_decoder_config(session->info.asc, session->info.asc_size);
    format_encoder_name(session);
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

uint32_t wasm_converter_rate_control(const wasm_converter *session)
{
    return session ? session->rate_control : FAAC_RC_ABR;
}

uint32_t wasm_converter_bit_rate(const wasm_converter *session)
{
    return session ? session->info.bit_rate : 0;
}

uint32_t wasm_converter_quant_quality(const wasm_converter *session)
{
    return session ? session->info.quality : 0;
}

/* Rate the encoder actually runs at (differs from the input after resampling). */
uint32_t wasm_converter_sample_rate(const wasm_converter *session)
{
    return session ? session->sample_rate : 0;
}

const char *wasm_converter_encoder_name(const wasm_converter *session)
{
    return session ? session->encoder_name : "";
}

void *wasm_converter_input(const wasm_converter *session)
{
    return session ? session->input : NULL;
}

/* `data` holds `frames` interleaved frames in the encoder's input format, or
 * is NULL to flush. */
static int encode_frame(wasm_converter *session, const void *data, uint32_t frames, uint32_t *written)
{
    faac_status status = faac_encoder_encode(session->encoder,
        frames ? data : NULL, frames * session->channels,
        session->output, session->info.max_output_bytes, written);
    if (status != FAAC_OK)
        return status;
    session->input_samples += frames;
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

/* Encode every full frame waiting in rs_out, refilling from the resampler's
 * internal buffer after each one. */
static int drain_pending(wasm_converter *session)
{
    uint32_t frame = session->info.frame_samples;
    while (session->pending == frame) {
        uint32_t written;
        int status = encode_frame(session, session->rs_out, frame, &written);
        if (status != FAAC_OK)
            return status;
        size_t made = 0;
        if (faar_resampler_process(session->resampler, NULL, 0, session->rs_out, frame, &made) != FAAR_OK)
            return FAAC_ERR_INTERNAL;
        session->pending = (uint32_t)made;
    }
    return FAAC_OK;
}

int wasm_converter_encode(wasm_converter *session, uint32_t samples)
{
    if (!session || session->finished || !samples || samples % session->channels)
        return FAAC_ERR_INVALID_ARGUMENT;
    if (samples > session->info.frame_samples * session->channels)
        return FAAC_ERR_INPUT_OVERFLOW;
    if (!session->resampler) {
        uint32_t written;
        return encode_frame(session, session->input, samples / session->channels, &written);
    }

    uint32_t frames = samples / session->channels;
    const float *in;
    if (session->source_float) {
        in = session->input;
    } else {
        const int16_t *src = session->input;
        for (uint32_t i = 0; i < samples; i++)
            session->rs_in[i] = (float)src[i] / 32768.0f;
        in = session->rs_in;
    }
    uint32_t frame = session->info.frame_samples;
    size_t made = 0;
    if (faar_resampler_process(session->resampler, in, frames,
            session->rs_out + (size_t)session->pending * session->channels,
            frame - session->pending, &made) != FAAR_OK)
        return FAAC_ERR_INTERNAL;
    session->pending += (uint32_t)made;
    return drain_pending(session);
}

typedef struct { const uint8_t *data; uint64_t size, pos; } mem_source;

static int32_t mem_read(void *user, void *buf, uint32_t bytes)
{
    mem_source *m = user;
    uint64_t n = m->size - m->pos;
    if (n > bytes)
        n = bytes;
    memcpy(buf, m->data + m->pos, (size_t)n);
    m->pos += n;
    return (int32_t)n;
}

static bool mem_seek(void *user, uint64_t offset)
{
    mem_source *m = user;
    if (offset > m->size)
        return false;
    m->pos = offset;
    return true;
}

static uint64_t mem_tell(void *user)
{
    return ((mem_source *)user)->pos;
}

static char *copy_text(const void *data, uint32_t bytes)
{
    if (!bytes || bytes > MAX_TAG_BYTES || memchr(data, 0, bytes))
        return NULL;
    char *text = malloc((size_t)bytes + 1);
    if (!text)
        return NULL;
    memcpy(text, data, bytes);
    text[bytes] = 0;
    return text;
}

static uint16_t be16(const uint8_t *v)
{
    return (uint16_t)((v[0] << 8) | v[1]);
}

/* Copy the descriptive tags out of an M4A/MP4 source so the caller can free it.
 * Only what the encode doesn't regenerate is kept: the encoder tag and
 * iTunSMPB/iTunNORM (gapless and loudness values go stale after re-encoding or
 * resampling) are skipped. Returns FAAC_OK, or an error the caller may ignore. */
int wasm_converter_read_tags(wasm_converter *session, const uint8_t *data, uint32_t size)
{
    static const struct { uint32_t key; mp4_tag_id_t id; } map[] = {
        { FAAM_METADATA_KEY_TITLE, MP4TAG_TITLE },
        { FAAM_METADATA_KEY_ARTIST, MP4TAG_ARTIST },
        { FAAM_METADATA_KEY_ARTIST_SORT, MP4TAG_ARTISTSORT },
        { FAAM_METADATA_KEY_ALBUM, MP4TAG_ALBUM },
        { FAAM_METADATA_KEY_ALBUM_SORT, MP4TAG_ALBUMSORT },
        { FAAM_METADATA_KEY_ALBUM_ARTIST, MP4TAG_ALBUMARTIST },
        { FAAM_METADATA_KEY_ALBUM_ARTIST_SORT, MP4TAG_ALBUMARTISTSORT },
        { FAAM_METADATA_KEY_COMPOSER, MP4TAG_COMPOSER },
        { FAAM_METADATA_KEY_COMPOSER_SORT, MP4TAG_COMPOSERSORT },
        { FAAM_METADATA_KEY_GENRE, MP4TAG_GENRE },
        { FAAM_METADATA_KEY_YEAR, MP4TAG_YEAR },
        { FAAM_METADATA_KEY_COMMENT, MP4TAG_COMMENT },
    };
    if (!session || session->finished || !data || !size)
        return FAAC_ERR_INVALID_ARGUMENT;

    mem_source source = { data, size, 0 };
    faam_io io;
    faam_io_init(&io, sizeof(io));
    io.user_data = &source;
    io.read = mem_read;
    io.seek = mem_seek;
    io.tell = mem_tell;
    faam_demuxer *demuxer = NULL;
    if (faam_demuxer_open(NULL, &io, &demuxer) != FAAM_OK)
        return FAAC_ERR_INVALID_ARGUMENT;
    uint32_t count = 0;
    faam_demuxer_get_num_metadata(demuxer, &count);
    for (uint32_t i = 0; i < count; i++) {
        faam_metadata_entry e = { .struct_size = sizeof(e) };
        if (faam_demuxer_get_metadata_entry(demuxer, i, &e) != FAAM_OK || !e.data)
            continue;
        const uint8_t *v = e.data;
        if (e.key == FAAM_METADATA_KEY_COVER_ART) {
            if (!session->cover && e.data_bytes && e.data_bytes <= MAX_COVER_BYTES &&
                (session->cover = malloc(e.data_bytes))) {
                memcpy(session->cover, v, e.data_bytes);
                session->cover_size = e.data_bytes;
            }
        } else if (e.key == FAAM_METADATA_KEY_TRACK && e.data_bytes >= 6) {
            if (!session->track) {
                session->track = be16(v + 2);
                session->ntracks = be16(v + 4);
            }
        } else if (e.key == FAAM_METADATA_KEY_DISC && e.data_bytes >= 6) {
            if (!session->disc) {
                session->disc = be16(v + 2);
                session->ndiscs = be16(v + 4);
            }
        } else if (e.key == FAAM_METADATA_KEY_COMPILATION) {
            if (e.data_bytes && v[0])
                session->compilation = 1;
        } else if (e.key == FAAM_METADATA_KEY_FREEFORM) {
            if (e.data_type != FAAM_METADATA_UTF8 || !e.name ||
                session->custom_count >= MAX_CUSTOM_TAGS ||
                (e.mean && strcmp(e.mean, "com.apple.iTunes")) ||
                !strcmp(e.name, "iTunSMPB") || !strcmp(e.name, "iTunNORM"))
                continue;
            char *value = copy_text(v, e.data_bytes);
            char *name = value ? strdup(e.name) : NULL;
            if (!name) {
                free(value);
                continue;
            }
            session->custom[session->custom_count].name = name;
            session->custom[session->custom_count++].value = value;
        } else if (e.data_type == FAAM_METADATA_UTF8) {
            for (size_t j = 0; j < sizeof(map) / sizeof(map[0]); j++) {
                if (map[j].key == e.key && !session->tags[map[j].id]) {
                    session->tags[map[j].id] = copy_text(v, e.data_bytes);
                    break;
                }
            }
        }
    }
    faam_demuxer_close(&demuxer);
    return FAAC_OK;
}

static void apply_tags(wasm_converter *session)
{
    for (int i = 0; i < MP4TAG_COUNT; i++)
        if (session->tags[i])
            mp4_set_tag((mp4_tag_id_t)i, session->tags[i]);
    if (session->track)
        mp4_set_track(session->track, session->ntracks);
    if (session->disc)
        mp4_set_disc(session->disc, session->ndiscs);
    if (session->compilation)
        mp4_set_compilation(true);
    if (session->cover)
        mp4_set_cover(session->cover, session->cover_size);
    for (uint32_t i = 0; i < session->custom_count; i++)
        mp4_add_custom_tag(session->custom[i].name, session->custom[i].value);
}

int wasm_converter_finish(wasm_converter *session)
{
    if (!session || session->finished)
        return FAAC_ERR_INVALID_ARGUMENT;
    uint32_t written;
    int status;
    if (session->resampler) {
        uint32_t frame = session->info.frame_samples;
        for (;;) {
            size_t flushed = 0;
            if (faar_resampler_finalize(session->resampler,
                    session->rs_out + (size_t)session->pending * session->channels,
                    frame - session->pending, &flushed) != FAAR_OK)
                return FAAC_ERR_INTERNAL;
            session->pending += (uint32_t)flushed;
            status = drain_pending(session);
            if (status != FAAC_OK)
                return status;
            if (!flushed)
                break;
        }
        if (session->pending) {
            status = encode_frame(session, session->rs_out, session->pending, &written);
            if (status != FAAC_OK)
                return status;
            session->pending = 0;
        }
    }
    do {
        status = encode_frame(session, NULL, 0, &written);
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
    apply_tags(session);
    if (mp4_finish() != 0)
        return WASM_ERR_MP4;
    int close_status = mp4_close();
    session->mp4_open = 0;
    session->finished = 1;
    return close_status == 0 ? FAAC_OK : WASM_ERR_MP4;
}
