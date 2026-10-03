---
title: Choose an AAC Encoder or Decoder
description: Compare FAAC, FAAD, FDK-AAC, Apple AudioToolbox, and FFmpeg. Choose an AAC implementation by profile support, integration needs, software license, and patent status.
---

# Choose an AAC Encoder or Decoder

Choose by **encoding or playback needs, hardware, required AAC profiles, and software license**. FAAC is an encoder; FAAD is a decoder. Start with your application below, then check profile support and licensing.

## Start with your application {data-icon="compass"}

| Your requirement | Start here |
| :--- | :--- |
| AAC/M4A output with compact C integration | FAAC; test quality and resource use for your workload |
| AAC playback in a C application | FAAD; choose the engine for your hardware and release requirements below |
| Lossless music storage or masters | FLAC; retain the original PCM information |
| Interactive voice or WebRTC | Opus; evaluate delay and communications requirements |
| HE-AAC v2 / Parametric Stereo encoding | FDK-AAC or Apple AudioToolbox where available; check software and patent licensing |
| Native Apple-platform audio conversion | AudioToolbox; query supported profiles, sample rates, and channel layouts |
| Digital Radio Mondiale (DRM) | An xHE-AAC implementation with the required DRM broadcast or receiver integration |
| Low-bitrate speech and music streaming | Compare xHE-AAC and Opus for your delivery format, playback support, and licensing requirements |
| An existing FFmpeg pipeline | The encoders available in your FFmpeg build; compare the settings you actually deploy |
| Playback on MP3-only hardware | LAME MP3 |

## Choose a decoder for your hardware {data-icon="microchip"}

| Your target | Decoder to evaluate | Why |
| :--- | :--- | :--- |
| Modern processor with an efficient FPU | FAAD3, if a development engine fits your project | Floating-point design; faster than Helix in the published Apple M1 test. LGPL v2.1+. |
| An application needing the released FAAD engine | FAAD2 | Released decoder with HE-AAC v2 Parametric Stereo (PS) support. GPL v2+. |
| Legacy processor or microcontroller without an efficient FPU | [LibHelix](https://github.com/earlephilhower/ESP8266Audio/blob/master/src/libhelix-aac/aacdec.c) | Fixed-point arithmetic; no HE-AAC v2 PS support. Check the selected port's license and profiles. |
| Existing FFmpeg application | The available libavcodec decoder | Reuse the media framework already in your pipeline. |
| Native Apple application | AudioToolbox | Use the platform's audio APIs and query available formats. |

An FPU is a hardware floating-point unit. Match the decoder to your processor; desktop throughput does not predict performance on a microcontroller. The [decoder benchmark comparison](/docs/optimization#decoder-performance-faad-vs-helix-and-others) shows measured speed, code size, and memory use.

## Library capabilities {data-icon="layer-group"}

### AAC encoders

| Encoder | Common AAC profiles | Integration |
| :--- | :--- | :--- |
| [FAAC](/docs/faac) | LC, HE v1 | C encoder library and CLI. |
| FFmpeg native AAC | **LC only; no HE v1/v2 encoding** | Built into libavcodec and the FFmpeg CLI. |
| [FDK-AAC](https://github.com/mstorsjo/fdk-aac) | LC, HE v1/v2 | Encoder library; `fdkaac` provides a separate CLI. Custom, non-free software license. |
| [Apple AudioToolbox](https://developer.apple.com/documentation/audiotoolbox) | LC, HE v1/v2 where available | Apple-platform APIs; query formats on the target OS. |

FFmpeg can also call optional FDK-AAC or Apple AudioToolbox backends. Their HE support belongs to those encoders, not FFmpeg's native AAC encoder. See [FFmpeg's encoder documentation](https://ffmpeg.org/ffmpeg-codecs.html#Audio-Encoders).

### AAC decoders

| Decoder | Common AAC profiles | Integration |
| :--- | :--- | :--- |
| [FAAD2](/docs/faad) | LC, HE v1/v2, Main, LTP | Released C decoder library and CLI; GPL v2+. |
| FAAD3 | Check the selected development build | Floating-point C decoder engine for FPU-equipped processors; LGPL v2.1+. |
| FFmpeg native AAC | LC, HE v1/v2 | Built into libavcodec and the FFmpeg CLI. |
| [FDK-AAC](https://github.com/mstorsjo/fdk-aac) | LC, HE v1/v2 | Decoder library with a custom, non-free software license. |
| [LibHelix](https://github.com/earlephilhower/ESP8266Audio/blob/master/src/libhelix-aac/aacdec.c) | LC, HE v1; **no HE v2 PS** | Fixed-point decoder; suitable for evaluating on hardware without an efficient FPU. |
| [Apple AudioToolbox](https://developer.apple.com/documentation/audiotoolbox) | LC, HE v1/v2 where available | Apple-platform APIs; query formats on the target OS. |

These tables show common profiles, not every extension. Check your selected release and build. [Apple's format identifiers](https://developer.apple.com/documentation/coreaudiotypes/audio-format-identifiers) describe platform capability queries; gapless playback also depends on the player.

## xHE-AAC, Digital Radio Mondiale, and Opus {data-icon="tower-broadcast"}

**FAAC supports LC and HE-AAC v1, not xHE-AAC.** xHE-AAC targets low-bitrate speech and music and is mandatory in **Digital Radio Mondiale (DRM)**, the digital radio broadcast standard. See [Fraunhofer's overview](https://www.iis.fraunhofer.de/en/ff/amm/broadcast-streaming/xheaac.html).

xHE-AAC and [Opus](https://opus-codec.org/) overlap in streaming uses; Opus also serves interactive voice and conferencing. Compare delay, playback support, and licensing. A DRM application needs broadcast or receiver integration in addition to an audio library.

## Software licenses and patent rights {data-icon="scale-balanced"}

FAAC uses LGPL v2.1+, released FAAD2 uses GPL v2+, and the FAAD3 development engine uses LGPL v2.1+. FDK-AAC has a custom license that [Fedora classifies as non-free](https://fedoraproject.org/wiki/Licensing/FDK-AAC). Check the license shipped with your version; software copyright and codec patents are separate.

### Patent status by AAC profile

| Profile | Patent considerations |
| :--- | :--- |
| AAC-LC | The foundational patents have expired. |
| HE-AAC v1 | The foundational patents, including Spectral Band Replication (SBR), have expired. |
| HE-AAC v2 | Adds **Parametric Stereo**; associated patents expire in 2029. |
| xHE-AAC | Has additional patent restrictions; check current licensing terms. |

These profile distinctions apply across implementations, including FFmpeg. Patent applicability depends on jurisdiction and implementation. See the [Via Licensing Alliance AAC program](https://www.via-la.com/licensing-programs/aac/) for current HE-AAC v2 and xHE-AAC licensing information.

Via LA states that it does not charge patent license fees for distributing AAC bitstreams, including broadcasts and streams. Encoder and decoder products have separate licensing considerations.

## Validate your choice {data-icon="circle-check"}

1. **Check your budget:** use the [AAC benchmark results](/docs/optimization) as a starting point, then measure CPU, code size, and RAM on your target.
2. **Check the sound:** [try the converter](/playground) or follow the [listening-test guide](/docs/listening) at your intended bitrate.
3. **Integrate:** follow the [FAAC encoder guide](/docs/faac), [FAAD decoder guide](/docs/faad), or [installation guide](/docs/install).
