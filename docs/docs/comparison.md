---
title: "FAAC vs FDK-AAC vs FFmpeg: Which AAC Codec?"
description: "Compare FAAC, FAAD, FDK-AAC, Apple AudioToolbox and FFmpeg AAC by profile support (LC, HE-AAC v1/v2), software license and patent status."
pageClass: comparison-page
---

# Choose an AAC Encoder or Decoder

Choose by **use case, hardware, required AAC profiles, and license**. FAAC covers both: the `faac` encoder and the FAAD3 decoder. Use the matrices to compare profile support.

## Start with your application {data-icon="compass"}

| Your requirement | Start here |
| :--- | :--- |
| AAC/M4A output from a C application | [Choose an AAC encoder](#choose-an-aac-encoder-for-your-application) |
| AAC playback in a C application | [Choose a decoder](#choose-a-decoder-for-your-hardware) |
| HE-AAC v2 encoding | [Choose an AAC encoder](#choose-an-aac-encoder-for-your-application) |
| Apple-platform AAC application | AudioToolbox; compare the [encoder](#aac-encoders) and [decoder](#aac-decoders) matrices |
| Existing FFmpeg pipeline | Choose an AAC encoder or decoder available in your FFmpeg build; compare the [encoder](#aac-encoders) and [decoder](#aac-decoders) matrices |
| Lossless music storage or masters | [FLAC](https://www.xiph.org/flac/); retain the original PCM information |
| Interactive voice or WebRTC | [Opus](#xhe-aac-digital-radio-mondiale-and-opus); evaluate delay and communications requirements |
| Low-bitrate speech and music streaming | Compare [xHE-AAC and Opus](#xhe-aac-digital-radio-mondiale-and-opus) for playback support and licensing |
| Digital Radio Mondiale (DRM) | A DRM-aware encoder and receiver stack; see [DRM notes](#xhe-aac-digital-radio-mondiale-and-opus) |
| Playback on MP3-only hardware | [LAME MP3 encoder](https://lame.sourceforge.io/) |

**Want to hear the difference?** [Try the browser converter](/playground) with your own audio, then use the comparisons below to narrow your choice.

## Choose an AAC encoder for your application {data-icon="compass"}

Choose based on the profile you need and the platform you are targeting. The capability matrix below shows supported profiles and build-dependent options.

| Your requirement | Encoder to evaluate |
| :--- | :--- |
| AAC/M4A output from a C application | [FAAC](/docs/faac) |
| Real-time encoding on an ESP32-S3 | [FAAC](/docs/faac); see [AAC on ESP32](/docs/esp32-aac) |
| HE-AAC v2 (Parametric Stereo) | [FAAC](/docs/faac) with Parametric Stereo enabled, FDK-AAC, or Apple AudioToolbox; see [patent notes](#patent-status-by-aac-profile) |
| Existing FFmpeg pipeline | An AAC encoder available in your FFmpeg build |
| Apple-platform application | AudioToolbox |
| Digital Radio Mondiale (DRM) | A DRM-aware encoder and receiver stack; see [DRM notes](#xhe-aac-digital-radio-mondiale-and-opus) |

For lossless music storage or masters, use [FLAC](https://www.xiph.org/flac/) and retain the original PCM. For interactive voice or WebRTC, evaluate Opus and its delay characteristics. For low-bitrate speech and music streaming, compare xHE-AAC and Opus for playback support and licensing. If you need playback on MP3-only hardware, use an MP3 encoder such as [LAME](https://lame.sourceforge.io/).

## Choose a decoder for your hardware {data-icon="microchip"}

| Your target | Decoder to evaluate | Why |
| :--- | :--- | :--- |
| ESP32-S3 or another microcontroller with an FPU | [FAAD](/docs/faad) | Real-time LC and HE-AAC; stereo HE-AAC v2 is supported. See [AAC on ESP32](/docs/esp32-aac). |
| ESP32-C6, ESP8266, or another microcontroller without an FPU | [Helix](https://github.com/earlephilhower/ESP8266Audio/blob/master/src/libhelix-aac/aacdec.c) | Recommended fixed-point decoder; stays real time where floating-point FAAD3 does not. |
| General-purpose decoding or microcontroller with an FPU | [FAAD](/docs/faad) | C11 decoder; LGPL v2.1+. |
| HE-AAC v2 Parametric Stereo on a constrained target | [FAAD](/docs/faad) on an FPU-equipped target; FDK-AAC (fixed-point) elsewhere | Adds PS support; verify the target build and memory budget. |
| Existing FFmpeg application | The available libavcodec decoder | Reuse the media framework already in your pipeline. |
| Native Apple application | AudioToolbox | Use the platform's audio APIs and query available formats. |

An FPU is a hardware floating-point unit. Desktop throughput does not predict microcontroller performance. See [AAC on ESP32](/docs/esp32-aac) for ESP32-specific results, and the [FAAD guide](/docs/faad) and [libfaad reference](/docs/libfaad) for build options.

## Library capabilities {data-icon="layer-group"}

Use these matrices to compare profile support across encoders and decoders. Support can depend on the specific build; notes below call out the main qualifications.

<p class="cmp-legend"><span class="cmp-yes">✓</span> Supported · <span class="cmp-partial">†</span> Build- or configuration-dependent · <span class="cmp-no">—</span> Not supported. Apple entries assume modern macOS/iOS.</p>

### AAC encoders

| Profile or extension | [FAAC](/docs/faac) | FFmpeg native | [FDK-AAC](https://github.com/mstorsjo/fdk-aac) | [Apple AudioToolbox](https://developer.apple.com/documentation/audiotoolbox) |
| :--- | :---: | :---: | :---: | :---: |
| AAC-LC | <span class="cmp-yes">✓</span> | <span class="cmp-yes">✓</span> | <span class="cmp-yes">✓</span> | <span class="cmp-yes">✓</span> |
| AAC Main | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> |
| AAC SSR | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> |
| AAC-LTP | <span class="cmp-no">—</span> | <span class="cmp-yes">✓</span> | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> |
| HE-AAC v1 (SBR) | <span class="cmp-yes">✓</span> | <span class="cmp-no">—</span> | <span class="cmp-yes">✓</span> | <span class="cmp-yes">✓</span> |
| HE-AAC v2 (SBR + PS) | <span class="cmp-partial" title="Build-dependent: requires encoder-ps">†</span> | <span class="cmp-no">—</span> | <span class="cmp-yes">✓</span> | <span class="cmp-yes">✓</span> |
| AAC-LD | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> | <span class="cmp-yes">✓</span> | <span class="cmp-yes">✓</span> |
| AAC-ELD (optionally with SBR) | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> | <span class="cmp-yes">✓</span> | <span class="cmp-yes">✓</span> |
| USAC / xHE-AAC | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> |
| DRM / DRM+ audio framing | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> | <span class="cmp-yes">✓</span> | <span class="cmp-no">—</span> |

FFmpeg builds can also include FDK-AAC or Apple AudioToolbox encoders. See [FFmpeg's encoder documentation](https://ffmpeg.org/ffmpeg-codecs.html#Audio-Encoders).

### AAC decoders

| Profile or extension | [FAAD](/docs/faad) | FFmpeg native | [FDK-AAC](https://github.com/mstorsjo/fdk-aac) | [Helix](https://github.com/earlephilhower/ESP8266Audio/blob/master/src/libhelix-aac/aacdec.c) | [Apple AudioToolbox](https://developer.apple.com/documentation/audiotoolbox) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| AAC-LC | <span class="cmp-yes">✓</span> | <span class="cmp-yes">✓</span> | <span class="cmp-yes">✓</span> | <span class="cmp-yes">✓</span> | <span class="cmp-yes">✓</span> |
| AAC Main | <span class="cmp-no">—</span> | <span class="cmp-yes">✓</span> | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> |
| AAC SSR | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> |
| AAC-LTP | <span class="cmp-no">—</span> | <span class="cmp-yes">✓</span> | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> |
| HE-AAC v1 (SBR) | <span class="cmp-yes">✓</span> | <span class="cmp-yes">✓</span> | <span class="cmp-yes">✓</span> | <span class="cmp-yes">✓</span> | <span class="cmp-yes">✓</span> |
| HE-AAC v2 (SBR + PS) | <span class="cmp-yes">✓</span> | <span class="cmp-yes">✓</span> | <span class="cmp-yes">✓</span> | <span class="cmp-no">—</span> | <span class="cmp-yes">✓</span> |
| ER-LC / ER-LTP | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> |
| AAC-LD | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> | <span class="cmp-yes">✓</span> | <span class="cmp-no">—</span> | <span class="cmp-yes">✓</span> |
| AAC-ELD | <span class="cmp-no">—</span> | <span class="cmp-partial" title="Build- or configuration-dependent">†</span> | <span class="cmp-yes">✓</span> | <span class="cmp-no">—</span> | <span class="cmp-yes">✓</span> |
| USAC / xHE-AAC | <span class="cmp-no">—</span> | <span class="cmp-partial" title="Build- or configuration-dependent">†</span> | <span class="cmp-yes">✓</span> | <span class="cmp-no">—</span> | <span class="cmp-yes">✓</span> |
| DRM / DRM+ audio transport | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> | <span class="cmp-yes">✓</span> | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> |

<details>
<summary>Profile support notes</summary>

“Main,” “SSR,” and “LTP” are AAC profiles; SBR and PS extend the LC core to HE-AAC v1 and v2. FAAC encodes HE-AAC v2 only when built with `encoder-ps`. FAAD includes HE-AAC v2 decoding in its default build; PS support can be disabled at build time. FAAD3 does not decode Main, SSR, LTP, ER or DRM streams. FFmpeg ELD and USAC support depends on its build.

Profile support does not guarantee every transport, sample rate, or channel layout. Check the selected release and build. Apple rates and channel layouts depend on the requested format; see [Apple's format identifiers](https://developer.apple.com/documentation/coreaudiotypes/audio-format-identifiers).

</details>

For measured decoder quality, speed, and memory, see the [decoder results](/docs/aac-benchmark#aac-decoder-quality-and-speed).

## Software licenses and patent rights {data-icon="scale-balanced"}

| Implementation | Software license |
| :--- | :--- |
| FAAC 2.0 and later | LGPL v2.1 or later. |
| FAAD 3.0 and later | LGPL v2.1 or later. |
| FDK-AAC | [Custom license](https://github.com/mstorsjo/fdk-aac/blob/master/NOTICE) with redistribution and source-availability conditions; it grants no patent rights. [Fedora treats it as not allowed for new packages](https://docs.fedoraproject.org/tr/legal/not-allowed-licenses/), with an exception for continued packaging of `fdk-aac-free`. |
| Opus reference implementation | [Three-clause BSD license](https://www.opus-codec.org/license/); royalty-free patent licenses also apply. |
| Helix | [RealNetworks Public Source License (RPSL)](https://github.com/earlephilhower/ESP8266Audio/blob/master/src/libhelix-aac/aacdec.c), unless separately licensed under the RealNetworks Community Source License (RCSL). |
| FFmpeg | Build-dependent: LGPL v2.1+ by default; GPL v2+ when GPL components are enabled. See [FFmpeg's licensing guidance](https://www.ffmpeg.org/legal.html). |
| Legacy FAAD2 | GPL v2 or later. |
| [FAAD2 compatibility shim](https://github.com/FreewareAdvancedAudio/faad2) | GPL v2 or later; implements the `NeAACDec*` API over FAAD3. |
| Legacy FAAC 1.x | Included ISO MPEG-4 reference code under terms distinct from the LGPL; check the exact release. |

Check the license shipped with the exact version you use. Software copyright and codec patents are separate; see the patent notes below.

### Patent status by AAC profile

| Profile | Patent considerations |
| :--- | :--- |
| AAC-LC | The foundational patents have expired. |
| HE-AAC v1 | The foundational patents, including Spectral Band Replication (SBR), have expired. |
| HE-AAC v2 | Adds **Parametric Stereo**; associated patents expire in 2030. |
| xHE-AAC | Has additional patent restrictions; check current licensing terms. |

These profile distinctions apply across implementations, including FFmpeg. Patent applicability depends on jurisdiction and implementation. See the [Via Licensing Alliance AAC program](https://www.via-la.com/licensing-programs/aac/) for current HE-AAC v2 and xHE-AAC licensing information.

Via LA states that it does not charge patent license fees for distributing AAC bitstreams, including broadcasts and streams. Encoder and decoder products have separate licensing considerations.

## xHE-AAC, Digital Radio Mondiale, and Opus {data-icon="tower-broadcast"}

For streaming or broadcast use cases beyond the profiles in the matrices, compare format support, licensing, and the full transport stack. **DRM can carry AAC with SBR/PS or xHE-AAC; FAAC does not encode xHE-AAC.** FDK-AAC supports DRM/DRM+ audio transport. A complete receiver also needs radio demodulation and service signaling. See [Fraunhofer's xHE-AAC overview](https://www.iis.fraunhofer.de/en/ff/amm/broadcast-streaming/xheaac.html) and the [DRM system specification](https://www.etsi.org/deliver/etsi_es/201900_201999/201980/04.03.00_50/es_201980v040300m.pdf).

xHE-AAC and [Opus](https://opus-codec.org/) overlap in streaming uses; Opus also serves interactive voice and conferencing. Compare delay, playback support, and licensing.
