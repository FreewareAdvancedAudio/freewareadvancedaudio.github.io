---
title: "Audio Codec Comparison: FAAC vs FDK-AAC, Opus, FLAC, MP3"
description: "FAAC vs FDK-AAC, Opus, FLAC and MP3 compared by use case, bitrate, patent status and license. Pick the right audio encoder or decoder."
pageClass: comparison-page
titleTemplate: false
---

# Choose an Audio Encoder or Decoder

Find the right codec for your job, with its patent status. FAAC (AAC encoder) and FAAD3 (AAC decoder) are valid choices for some jobs, not all; this page says which.

The FAAC project wrote this page and ran the [benchmark](/docs/aac-benchmark) it cites.

## Which format do I need? {data-icon="compass"}

| You need | Use | Patents |
| :--- | :--- | :--- |
| Lossless archive or masters | **[FLAC](https://xiph.org/flac/)**; ALAC if Apple-only | FLAC: royalty-free. ALAC: [Apache 2.0 source](https://macosforge.github.io/alac/). |
| Music or general audio that plays on any device | **[AAC](#aac-encoder-and-decoder-choices)** | LC and HE-AAC v1 expired |
| Voice calls, WebRTC, or a player you control | **[Opus](#opus-xhe-aac-and-other-alternatives)**: higher objective quality, about 7× FAAC's encode time | Royalty-free grants |
| MP3-only hardware | **[LAME](https://lame.sourceforge.io/)** | Expired; licensing ended 2017 |
| Listening to digital radio | DAB+ is [HE-AAC v2](https://www.worlddab.org/glossary); DRM can be xHE-AAC or HE-AAC. [Pick a decoder](#aac-decoder-choices). | HE-AAC v2 to 2030; xHE-AAC restricted |

**Software license and patents are separate questions.** The LGPL covers copyright, not patents. See [patent status](#patent-status-by-aac-profile).

- **Encoding for a patent-averse product:** use AAC-LC or HE-AAC v1 (FAAC is LGPL v2.1+), Opus or FLAC. Skip HE-AAC v2 until its patents expire in 2030, and skip xHE-AAC.
- **Decoding:** FAAD3 can drop Parametric Stereo at build time (`-Ddecoder-ps=false`). HE-AAC v2 streams then play as mono ([build options](/docs/esp32-aac#trim-the-build)).

## AAC encoder and decoder choices {data-icon="music"}

### Which AAC profile at which bitrate? {#which-aac-profile-at-which-bitrate}

| Bitrate (stereo) | Profile | Encoders | Patents |
| :--- | :--- | :--- | :--- |
| 128 kbps and up | **AAC-LC** | FAAC, FDK-AAC, Apple, FFmpeg `aac` | Expired |
| 16–96 kbps | **HE-AAC v1** | FAAC, FDK-AAC, Apple. Not FFmpeg `aac`. | Expired |
| 16–24 kbps | **HE-AAC v2** | FDK-AAC, Apple, or FAAC with `encoder-ps` (off by default) | Parametric Stereo to 2030 |

Profiles are not a quality ladder; each wins in a range. These ranges come from the FAAC project's benchmark at 48 kHz stereo ([full report](https://gist.github.com/nschimme/c6a8d8e95992f94650fc2c700581be40)). At 48 kbps, FAAC scores 4.297 MOS with HE-AAC v1 and 4.177 with LC. HE-AAC v2 leads at 16 kbps for FAAC, FDK-AAC and Apple. At 24 kbps it leads for FDK-AAC and Apple, while FAAC's HE-AAC v1 scores 3.484 against 3.283 for v2.

Crossovers vary by encoder, sample rate and content. Test your own audio with the [browser converter](/playground) or the [listening guide](/docs/listening).

### Which AAC encoder? {#choose-an-aac-encoder-for-your-application}

| Where you encode | Use |
| :--- | :--- |
| A C application or embedded device | **[FAAC](/docs/faac)**: 37 KB minimal encoder on ESP32 ([AAC on ESP32](/docs/esp32-aac)) |
| Inside FFmpeg | **`libfdk_aac`** (non-free build) or **`aac_at`** (macOS) for HE-AAC. Native `aac` is LC only. For FAAC, pipe to the `faac` CLI. |
| A terminal | **`faac`** ([CLI guide](/docs/faac-cli)), FFmpeg, or **[qaac](https://github.com/nu774/qaac)** (also encodes ALAC; needs Apple's libraries for AAC). No install: the [browser converter](/playground). |
| An Apple-platform app | **AudioToolbox** |
| Low-delay AAC (LD, ELD) | **FDK-AAC** or Apple. Not FAAC. |
| xHE-AAC (USAC) | **[exhale](https://gitlab.com/ecodis/exhale)**, an open-source alternative to FDK-AAC, which this page lists as decoder-only. [Patent restrictions](#patent-status-by-aac-profile) apply. Not FAAC. |

### Which AAC decoder? {#aac-decoder-choices}

| Where you decode | Use |
| :--- | :--- |
| Microcontroller with an FPU (ESP32-S3) | **[FAAD3](/docs/faad)**: real-time LC and HE-AAC, stereo HE-AAC v2 |
| Microcontroller without an FPU (ESP32-C6, ESP8266) | **[Helix](https://github.com/earlephilhower/ESP8266Audio/blob/master/src/libhelix-aac/aacdec.c)** (no HE-AAC v2) or FDK-AAC fixed-point. FAAD3 isn't real time without an FPU. |
| DAB+ radio | **FAAD3** decodes DAB+'s 960-sample frames in its default build (`decoder-dab`; [libfaad reference](/docs/libfaad)). |
| DRM radio | **FDK-AAC**, the only listed decoder with DRM and DRM+ audio transport. Not FAAD3. |
| Desktop or an existing framework | **FAAD3**, or the framework's own decoder: FFmpeg, AudioToolbox |

A radio receiver also needs demodulation and service signaling.

### How good is FAAC?

In our benchmark, FAAC matches or beats FDK-AAC, Apple and FFmpeg on objective quality at most bitrates, and it is the fastest of the four. FDK-AAC and Apple edge ahead at a few bitrates, by small margins. The scores are computer estimates, not listening tests, and the FAAC project ran them. See the [benchmark](/docs/aac-benchmark) for charts, numbers and method, and the [listening guide](/docs/listening) to check with your own ears.

## Opus, xHE-AAC, and other alternatives {data-icon="tower-broadcast"}

Both target low bitrates and mixed speech and music. Check whether every player can decode them and what they cost to run.

- **Opus:** choose it for voice, WebRTC, or a player you control. FAAC and FAAD3 don't do Opus. In our [October 2026 leaderboard](https://gist.github.com/nschimme/2bfb1d981ab3c388f819a627721d47ed) on the same MacBook Pro M1, Opus scored higher on objective quality than the AAC encoders but took about 7× longer to encode than FAAC. A 2011 [Hydrogenaudio listening test](https://listening-tests.hydrogenaudio.org/igorc/results.html) at 64 kbps also rated Opus above two HE-AAC encoders.
- **xHE-AAC:** choose it for very low bitrates when your players are known to decode it, including some DRM radio. FAAC and FAAD3 don't do it; FDK-AAC and Apple decode it. Encoders are commercial or platform-specific, apart from the open-source [exhale](https://gitlab.com/ecodis/exhale); verify availability. We have no quality or speed data and found no published comparison; Fraunhofer claims better quality than HE-AAC at low bitrates. [Patent restrictions](https://www.via-la.com/licensing-programs/aac/) apply. See the [DRM specification](https://www.etsi.org/deliver/etsi_es/201900_201999/201980/04.03.00_50/es_201980v040300m.pdf).

Objective scores are computer estimates, not listening tests. The [leaderboard](https://gist.github.com/nschimme/2bfb1d981ab3c388f819a627721d47ed) has the numbers, scenarios and method.

## Library capabilities {data-icon="layer-group"}

Support can depend on the specific build. Rows where no listed implementation has support are covered in the notes below.

<p class="cmp-legend"><span class="cmp-yes">✓</span> Supported · <span class="cmp-partial">†</span> Build- or configuration-dependent · <span class="cmp-no">—</span> Not supported. Apple entries assume modern macOS/iOS.</p>

### AAC encoders {#aac-encoders}

| Profile or extension | [FAAC](/docs/faac) | FFmpeg native | [FDK-AAC](https://github.com/mstorsjo/fdk-aac) | [Apple AudioToolbox](https://developer.apple.com/documentation/audiotoolbox) |
| :--- | :---: | :---: | :---: | :---: |
| AAC-LC | <span class="cmp-yes">✓</span> | <span class="cmp-yes">✓</span> | <span class="cmp-yes">✓</span> | <span class="cmp-yes">✓</span> |
| AAC-LTP | <span class="cmp-no">—</span> | <span class="cmp-yes">✓</span> | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> |
| HE-AAC v1 (SBR) | <span class="cmp-yes">✓</span> | <span class="cmp-no">—</span> | <span class="cmp-yes">✓</span> | <span class="cmp-yes">✓</span> |
| HE-AAC v2 (SBR + PS) | <span class="cmp-partial" title="Requires a build with encoder-ps; off by default">†</span> | <span class="cmp-no">—</span> | <span class="cmp-yes">✓</span> | <span class="cmp-yes">✓</span> |
| AAC-LD | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> | <span class="cmp-yes">✓</span> | <span class="cmp-yes">✓</span> |
| AAC-ELD (optionally with SBR) | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> | <span class="cmp-yes">✓</span> | <span class="cmp-yes">✓</span> |
| DRM / DRM+ audio framing | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> | <span class="cmp-yes">✓</span> | <span class="cmp-no">—</span> |

FFmpeg builds can also include FDK-AAC or Apple AudioToolbox encoders ([FFmpeg encoder documentation](https://ffmpeg.org/ffmpeg-codecs.html#Audio-Encoders)). [qaac](https://github.com/nu774/qaac)'s AAC output on Windows comes from Apple's AudioToolbox and follows the Apple column.

### AAC decoders {#aac-decoders}

| Profile or extension | [FAAD](/docs/faad) | FFmpeg native | [FDK-AAC](https://github.com/mstorsjo/fdk-aac) | [Helix](https://github.com/earlephilhower/ESP8266Audio/blob/master/src/libhelix-aac/aacdec.c) | [Apple AudioToolbox](https://developer.apple.com/documentation/audiotoolbox) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| AAC-LC | <span class="cmp-yes">✓</span> | <span class="cmp-yes">✓</span> | <span class="cmp-yes">✓</span> | <span class="cmp-yes">✓</span> | <span class="cmp-yes">✓</span> |
| AAC Main | <span class="cmp-no">—</span> | <span class="cmp-yes">✓</span> | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> |
| AAC-LTP | <span class="cmp-no">—</span> | <span class="cmp-yes">✓</span> | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> |
| HE-AAC v1 (SBR) | <span class="cmp-yes">✓</span> | <span class="cmp-yes">✓</span> | <span class="cmp-yes">✓</span> | <span class="cmp-yes">✓</span> | <span class="cmp-yes">✓</span> |
| HE-AAC v2 (SBR + PS) | <span class="cmp-yes">✓</span> | <span class="cmp-yes">✓</span> | <span class="cmp-yes">✓</span> | <span class="cmp-no">—</span> | <span class="cmp-yes">✓</span> |
| AAC-LD | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> | <span class="cmp-yes">✓</span> | <span class="cmp-no">—</span> | <span class="cmp-yes">✓</span> |
| AAC-ELD | <span class="cmp-no">—</span> | <span class="cmp-partial" title="Build- or configuration-dependent">†</span> | <span class="cmp-yes">✓</span> | <span class="cmp-no">—</span> | <span class="cmp-yes">✓</span> |
| USAC / xHE-AAC | <span class="cmp-no">—</span> | <span class="cmp-partial" title="Build- or configuration-dependent">†</span> | <span class="cmp-yes">✓</span> | <span class="cmp-no">—</span> | <span class="cmp-yes">✓</span> |
| DRM / DRM+ audio transport | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> | <span class="cmp-yes">✓</span> | <span class="cmp-no">—</span> | <span class="cmp-no">—</span> |

<details>
<summary>Profile support notes</summary>

No listed encoder implements AAC Main, AAC SSR or USAC/xHE-AAC, and no listed decoder implements AAC SSR or ER-LC/ER-LTP, so those rows are omitted. FAAD3 does not decode Main, SSR, LTP, ER or DRM streams. SBR and PS extend the LC core to HE-AAC v1 and v2.

FAAC encodes HE-AAC v2 only when built with `encoder-ps`, which is off by default. FAAD decodes HE-AAC v2 in its default build; PS support can be disabled at build time. FFmpeg ELD and USAC support depends on its build.

Profile support does not guarantee every transport, sample rate, or channel layout. Check the selected release and build. Apple rates and channel layouts depend on the requested format; see [Apple's format identifiers](https://developer.apple.com/documentation/coreaudiotypes/audio-format-identifiers).

</details>

For measured decoder quality, speed, and memory, see the [decoder results](/docs/aac-benchmark#aac-decoder-quality-and-speed).

## Software licenses {data-icon="scale-balanced"}

| Implementation | Software license |
| :--- | :--- |
| FAAC 2.0 and later | LGPL v2.1 or later. |
| FAAD 3.0 and later | LGPL v2.1 or later. |
| FDK-AAC | [Custom license](https://github.com/mstorsjo/fdk-aac/blob/master/NOTICE) with redistribution and source-availability conditions; it grants no patent rights. [Fedora treats it as not allowed for new packages](https://docs.fedoraproject.org/tr/legal/not-allowed-licenses/), with an exception for continued packaging of `fdk-aac-free`. |
| Opus reference implementation | [Three-clause BSD license](https://www.opus-codec.org/license/); royalty-free patent licenses also apply. |
| Helix | [RealNetworks Public Source License (RPSL)](https://github.com/earlephilhower/ESP8266Audio/blob/master/src/libhelix-aac/aacdec.c), unless separately licensed under the RealNetworks Community Source License (RCSL). |
| FFmpeg | Build-dependent: LGPL v2.1+ by default; GPL v2+ when GPL components are enabled. See [FFmpeg's licensing guidance](https://www.ffmpeg.org/legal.html). |
| [qaac](https://github.com/nu774/qaac) | AAC output needs Apple's proprietary CoreAudioToolbox libraries, which you supply from an Apple installer; check Apple's terms. Its ALAC encoder is cross-platform. |
| Legacy FAAD2 | GPL v2 or later. |
| [FAAD2 compatibility shim](https://github.com/FreewareAdvancedAudio/faad2) | GPL v2 or later; implements the `NeAACDec*` API over FAAD3. |
| Legacy FAAC 1.x | Included ISO MPEG-4 reference code under terms distinct from the LGPL; check the exact release. |

Check the license shipped with the exact version you use.

## Patent status by AAC profile {#patent-status-by-aac-profile data-icon="gavel"}

| Format or profile | Patent considerations |
| :--- | :--- |
| AAC-LC | The foundational patents have expired. |
| HE-AAC v1 | The foundational patents, including Spectral Band Replication (SBR), have expired. |
| HE-AAC v2 | Adds **Parametric Stereo**; associated patents expire in 2030. |
| xHE-AAC | Has additional patent restrictions; check current licensing terms. |
| MP3 | Fraunhofer and Technicolor ended their [MP3 licensing program in April 2017](https://www.engadget.com/2017/05/12/mp3-is-dead-long-live-aac/) as the patents expired. |
| Opus | Royalty-free patent licenses accompany the [reference implementation](https://www.opus-codec.org/license/). |
| FLAC | Xiph.Org describes [FLAC as royalty-free](https://xiph.org/flac/). |
| ALAC | Apple released the [source](https://macosforge.github.io/alac/) under Apache 2.0 in 2011. Check patent terms for your use. |

These profile distinctions apply across implementations, including FFmpeg. Patent applicability depends on jurisdiction and implementation. See the [Via Licensing Alliance AAC program](https://www.via-la.com/licensing-programs/aac/) for current HE-AAC v2 and xHE-AAC licensing information. This page is not legal advice.
