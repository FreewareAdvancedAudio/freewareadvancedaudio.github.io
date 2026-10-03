---
title: FAAD AAC Decoder Guide & C API Reference
description: Complete guide for FAAD (MPEG-4 AAC decoder). Includes CLI examples, multi-channel surround decoding, and libfaad C API documentation.
---

# FAAD AAC Decoder Guide & C API Reference

**FAAD (Freeware Advanced Audio Decoder)** is an open-source MPEG-2 and MPEG-4 AAC audio decoder.

The released **FAAD2** engine is licensed under **GPL v2+** (written in C99). The next-generation **FAAD3** engine is written in clean C11 under **LGPL v2.1+**, providing lightweight decoding for embedded systems and cross-platform applications.

See the [decoder performance comparison](/docs/optimization#decoder-performance-faad-vs-helix-and-others) for measured throughput, footprint, and memory use alongside Helix, FDK-AAC, FFmpeg, and Apple.

**Hardware fit:** FAAD3 targets modern processors with floating-point units (FPUs). Fixed-point LibHelix is a better option to evaluate for legacy hardware without an efficient FPU, provided its profile support meets your needs.

---

::: info Choose a decoder version
The installation commands and `NeAACDec*` examples below target released FAAD2. FAAD3 is a separate development engine; consult its selected build for API and profile support. FAAD2 and FAAD3 have different software licenses.
:::

## Technical Highlights {data-icon="sliders"}

| Feature | Details |
| :--- | :--- |
| **Licensing** | FAAD2: GPL v2+ (C99) \| FAAD3: LGPL v2.1+ (C11) |
| **Supported Profiles** | MPEG-4 AAC-LC, HE-AAC v1 (SBR), HE-AAC v2 (PS), Main, LTP |
| **Surround Sound** | Up to 7.1 channel surround sound with optional 2-channel downmix (`-d`) |
| **Containers** | Raw ADTS `.aac`, MP4/M4A containers, ADIF streams |
| **Installation** | See [Installation Guide](/docs/install) |
| **Full CLI Options** | See [FAAD CLI Manual Page](/docs/faad-cli) |

---

## Quick Start CLI Examples {data-icon="terminal"}

```bash
# 1. Decode AAC or M4A to uncompressed WAV
faad -o decoded_output.wav input.m4a

# 2. Inspect bitstream parameters and audio metadata
faad -i audio_file.aac

# 3. Downmix 5.1 surround sound stream to 2-channel stereo WAV
faad -d -o stereo_downmix.wav surround_51.m4a
```

For complete options and flags, view the dedicated [FAAD Command-Line Manual](/docs/faad-cli).

---

## C API Reference (`libfaad`) {data-icon="code"}

For the FAAD2 API shown here, link against `-lfaad` and include `<neaacdec.h>`.

### Integration Lifecycle

```c
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <neaacdec.h>

int main(void) {
    // 1. Allocate decoder handle
    NeAACDecHandle hDecoder = NeAACDecOpen();
    if (!hDecoder) return 1;

    // 2. Configure decoder (16-bit PCM output)
    NeAACDecConfigurationPtr config = NeAACDecGetCurrentConfiguration(hDecoder);
    config->outputFormat = FAAD_FMT_16BIT;
    NeAACDecSetConfiguration(hDecoder, config);

    // 3. Initialize decoder with bitstream header
    unsigned char buffer[2048] = { /* AAC header or first frame bytes */ };
    unsigned long sampleRate;
    unsigned char channels;

    if (NeAACDecInit(hDecoder, buffer, sizeof(buffer), &sampleRate, &channels) < 0) {
        NeAACDecClose(hDecoder);
        return 1;
    }

    // 4. Decode frame
    NeAACDecFrameInfo frameInfo;
    void *pcmSamples = NeAACDecDecode(hDecoder, &frameInfo, buffer, sizeof(buffer));

    // 5. Cleanup
    NeAACDecClose(hDecoder);
    return 0;
}
```

### Core API Functions

#### `NeAACDecOpen`
```c
NeAACDecHandle NeAACDecOpen(void);
```
Initializes a new FAAD decoder instance.

#### `NeAACDecGetCurrentConfiguration` / `NeAACDecSetConfiguration`
```c
NeAACDecConfigurationPtr NeAACDecGetCurrentConfiguration(NeAACDecHandle hDecoder);
unsigned char NeAACDecSetConfiguration(NeAACDecHandle hDecoder, NeAACDecConfigurationPtr config);
```
Gets and sets decoder settings (PCM sample format, downmixing).

#### `NeAACDecInit`
```c
long NeAACDecInit(NeAACDecHandle hDecoder, unsigned char *buffer,
                  unsigned long bufferSize, unsigned long *sampleRate,
                  unsigned char *channels);
```
Parses stream header / AudioSpecificConfig bytes to set sample rate and channels.

#### `NeAACDecDecode`
```c
void* NeAACDecDecode(NeAACDecHandle hDecoder, NeAACDecFrameInfo *frameInfo,
                     unsigned char *buffer, unsigned long bufferSize);
```
Decodes a single AAC frame into raw PCM audio samples and updates `frameInfo`.

#### `NeAACDecClose`
```c
void NeAACDecClose(NeAACDecHandle hDecoder);
```
Frees decoder handle memory and resources.
