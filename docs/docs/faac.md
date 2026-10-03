---
title: FAAC AAC Encoder Guide & C API Reference
description: Complete guide for FAAC (LGPL v2.1+ AAC encoder). Includes CLI usage examples, M4A container output, gapless playback metadata support, and libfaac C API documentation.
---

# FAAC AAC Encoder Guide & C API Reference

**FAAC (Freeware Advanced Audio Coder)** is an open-source MPEG-2 and MPEG-4 AAC audio encoder licensed under **LGPL v2.1+**.

FAAC provides AAC-LC and HE-AAC v1 encoding in C. See the [AAC benchmark results](/docs/optimization) for measured quality and resource use, or the [implementation selection guide](/docs/comparison) to choose an encoder.

::: info Match the API to your build
The C API below follows the header vendored by this website. Package-manager releases may expose an older API or lack newer features. Check your installed `faac.h`, CLI help, and release notes before using these examples.
:::

---

## Technical Highlights {data-icon="sliders"}

| Feature | Details |
| :--- | :--- |
| **License** | GNU Lesser General Public License v2.1+ (LGPL v2.1+) |
| **Supported Profiles** | MPEG-4 AAC-LC, HE-AAC v1 (SBR) |
| **Container Support** | Genuine ISO MP4 / M4A (`.m4a`) containers with gapless playback metadata |
| **Rate Control** | Average Bitrate (`-b`), Variable Bitrate (`-q`), Constant Bitrate (`--cbr`) |
| **Installation** | See [Installation Guide](/docs/install) |
| **Full CLI Options** | See [FAAC CLI Manual Page](/docs/faac-cli) |

---

## Quick Start CLI Examples {data-icon="terminal"}

```bash
# 1. Standard stereo M4A container encoding (128 kbps ABR - recommended default)
faac --object-type lc -b 128 -o output.m4a input.wav

# 2. Higher-bitrate M4A encoding (192 kbps ABR)
faac --object-type lc -b 192 -o high_quality.m4a input.wav

# 3. Low-bitrate streaming (64 kbps HE-AAC v1 / SBR)
faac --object-type he-aac-v1 -b 64 -o low_bitrate.m4a input.wav
```

For complete options and flags, view the dedicated [FAAC Command-Line Manual](/docs/faac-cli).

---

## M4A Container & Gapless Playback {data-icon="file-audio"}

When wrapping raw AAC bitstreams into MP4/M4A containers (`-o filename.m4a`), FAAC automatically creates valid ISO MP4 atoms (`ftyp`, `moov`, `stsz`, `mdat`).

In addition, FAAC writes iTunes-compatible gapless metadata (`iTunSMPB` box) into the container:
* **Priming Delay (`encoder_delay`)**: Records exact samples introduced by filterbanks during initialization.
* **Padding Samples**: Records zero padding samples added at the end of the final audio frame.

Players that recognize the metadata can remove encoder priming and padding for gapless playback. Support varies by player; test the playback applications you intend to use.

You can try gapless M4A container encoding live in your browser on the [browser converter](/playground).

---

## C API Reference (`libfaac`) {data-icon="code"}

Modern releases of FAAC feature a thread-safe C API. Link against `-lfaac` and include `<faac.h>`.

### Integration Lifecycle

```c
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <faac.h>

int main(void) {
    faac_params params;
    faac_encoder *hEncoder = NULL;

    // 1. Initialize parameter struct (zeroes memory and stamps struct_size)
    faac_params_init(&params, sizeof(params));
    params.sample_rate = 44100;
    params.num_channels = 2;
    params.bit_rate = 64000; // Bitrate per channel (64 kbps x 2 = 128 kbps stereo)
    params.object_type = FAAC_OBJ_LOW; // AAC-LC
    params.output_format = FAAC_STREAM_ADTS;
    params.input_format = FAAC_INPUT_16BIT;

    // 2. Open encoder instance
    faac_status st = faac_encoder_open(&params, &hEncoder);
    if (st != FAAC_OK) {
        fprintf(stderr, "Encoder open failed: %s\n", faac_strerror(st));
        return 1;
    }

    // 3. Query resolved encoder properties & gapless priming delay
    faac_encoder_info info = { .struct_size = sizeof(info) };
    st = faac_encoder_get_info(hEncoder, &info);
    if (st != FAAC_OK) {
        faac_encoder_close(&hEncoder);
        return 1;
    }

    printf("Frame samples: %u, Max output bytes: %u, Encoder delay: %u samples\n",
           info.frame_samples, info.max_output_bytes, info.encoder_delay);

    // 4. Encode one silent frame to demonstrate buffer handling
    uint32_t pcmSamples = info.frame_samples * params.num_channels;
    int16_t *pcmInput = calloc(pcmSamples, sizeof(int16_t));
    uint8_t *aacOutput = malloc(info.max_output_bytes);
    if (!pcmInput || !aacOutput) {
        free(pcmInput);
        free(aacOutput);
        faac_encoder_close(&hEncoder);
        return 1;
    }
    uint32_t bytesWritten = 0;

    st = faac_encoder_encode(hEncoder, pcmInput, pcmSamples, aacOutput, info.max_output_bytes, &bytesWritten);

    // 5. Cleanup
    free(pcmInput);
    free(aacOutput);
    faac_encoder_close(&hEncoder);
    return st == FAAC_OK ? 0 : 1;
}
```

This example demonstrates initialization and one encode call. A complete application reads PCM frames, writes returned packets, and flushes until no output remains. ADTS output here is an elementary AAC stream; producing M4A also requires an MP4 muxer.

### Core API Functions

#### `faac_params_init`
```c
faac_status faac_params_init(faac_params *p, uint32_t caller_size);
```
Zeroes parameter memory and sets `struct_size` to ensure ABI compatibility across versions.

#### `faac_encoder_open`
```c
faac_status faac_encoder_open(const faac_params *p, faac_encoder **out);
```
Validates supplied configuration parameters and initializes an encoder instance handle in `*out`.

#### `faac_encoder_get_info`
```c
faac_status faac_encoder_get_info(faac_encoder *enc, faac_encoder_info *out);
```
Queries resolved encoder properties, including `frame_samples`, `max_output_bytes`, and gapless priming delay (`encoder_delay`).

#### `faac_encoder_encode`
```c
faac_status faac_encoder_encode(faac_encoder *enc,
                                const void *in, uint32_t in_samples,
                                uint8_t *out, uint32_t out_cap,
                                uint32_t *bytes_written);
```
Encodes PCM audio samples into an AAC bitstream packet. Pass `in = NULL` or `in_samples = 0` to flush remaining buffered frames at end-of-stream.

#### Gapless Playback & Priming Delay (`encoder_delay`)
FAAC tracks exact encoder priming delay in `info.encoder_delay` (in output sample units). When muxing into MP4 containers (`.m4a`), use `encoder_delay` and padding sample counts to write gapless metadata atoms (`iTunSMPB` or edit lists), matching the gapless handling implemented in `faac` CLI.

#### `faac_encoder_close`
```c
faac_status faac_encoder_close(faac_encoder **enc);
```
Destroys encoder instance and sets handle to `NULL` to guard against double-free errors.
