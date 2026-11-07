---
title: "FAAC vs FDK-AAC: AAC Speed, Quality, Size"
description: "FAAC and FAAD3 benchmarked against FDK-AAC, Apple, FFmpeg and Helix: encoder speed, MOS quality from 16 to 320 kbps, memory and library size, with methods."
---

# FAAC & FAAD vs FDK-AAC: Speed, Quality, and Build Size

**Short answer:** in this benchmark, FAAC and FAAD3 are the fastest AAC encoder and decoder tested, and FAAC matches or beats FDK-AAC, Apple AAC and FFmpeg on objective quality at most bitrates, with the exceptions listed below. Together they are under a third of the ROM size of FDK-AAC, and both can be trimmed further at build time.

- **Quality at a given bitrate:** see the [encoder quality chart](#aac-encoder-quality-faac-vs-fdk-aac-apple-aac-and-ffmpeg), which covers 16 to 320 kbps.
- **Speed and memory:** see [encoder speed](#aac-encoder-speed-and-memory) and [decoder quality and speed](#aac-decoder-quality-and-speed).
- **Size and microcontrollers:** see [build size](#aac-library-size-faac-and-faad3-vs-fdk-aac) and [AAC on ESP32](/docs/esp32-aac), including the [build options](/docs/esp32-aac#trim-the-build) that shrink FAAC and FAAD to fit.
- **Choosing by profile, license or patents:** use the [implementation comparison](/docs/comparison). This page covers measurements only.

**Who ran this:** the benchmark is run by the FAAC project on its own [benchmark suite](https://github.com/nschimme/faac-benchmark), so read the results with that in mind. Every desktop figure is from one run on **November 8, 2026** on a **MacBook Pro M1, 32 GB**. Encoder and decoder results are separate sections of one generated leaderboard, not a single head-to-head.

## AAC encoder quality: FAAC vs FDK-AAC, Apple AAC, and FFmpeg {data-icon="chart-line"}

The chart plots average MOS (a 1.0–5.0 objective estimate, where 1.0 is poor and 5.0 is transparent; not a listening test) against requested bitrate, 16–320 kbps, for 48 kHz stereo. Each encoder is shown at its higher-scoring profile (AAC-LC or HE-AAC v1) at each bitrate.

<BenchmarkShowcase view="quality" />

**Where FAAC leads and where it doesn't** (48 kHz stereo, each encoder at its best profile):

- **FAAC is highest** across 16–128 kbps.
- **Apple edges ahead at 160–320 kbps**, by at most 0.008 MOS.

Every one of those gaps is small. Drag the marker on the chart to see the exact scores at any bitrate. At 48 kbps, for example, FAAC scores 4.346, FDK-AAC 4.267, Apple AAC 4.262 and FFmpeg 3.741.

Across all 30 scenarios, FAAC also ranks first on both overall and first-percentile MOS (the score that 99% of clips meet), with 4.490 and 2.783. Per-scenario results, profile breakdowns and bitrate accuracy are in the [full report](https://gist.github.com/nschimme/f126e982d84da89e930c8ea7deaf3505).

## AAC encoder speed and memory {data-icon="gauge-high"}

<BenchmarkShowcase view="resources" />

FAAC is the fastest encoder in the comparison at 4.2× FDK-AAC throughput. It also has the lowest peak RAM of the four encoders: 2.5 MB, versus 3.3 MB for FDK-AAC, 9.8 MB for Apple AAC and 17.5 MB for FFmpeg.

## AAC decoder quality and speed {data-icon="headphones"}

<BenchmarkShowcase view="decoder" />

FAAD3 is the fastest decoder tested and ties the top decoded quality.

- **Speed:** 2.4× FDK-AAC throughput, and 1.9–3.8× Apple AAC and FFmpeg.
- **Quality:** overall MOS is 4.133 for FAAD3, 4.133 for FFmpeg and 4.128 for FDK-AAC, which is effectively a tie. At 48 kHz stereo, FAAD3, FFmpeg and Apple match within about 0.003 MOS, and FDK-AAC does too on AAC-LC. On HE-AAC v1, FDK-AAC trails by up to about 0.03.
- **Memory:** peak RAM is 3.0 MB for FAAD3, versus 7.0 MB for FDK-AAC, 7.9 MB for Apple AAC and 16.6 MB for FFmpeg. Only Helix AAC is lower, at 1.9 MB.

Since quality is a tie, the practical differences between FAAD3, FFmpeg and FDK-AAC are speed, memory and size.

**The other two decoders:**

- **Apple AAC** scores lower overall (4.033 MOS, 14.6 dB mean SNR).
- **Helix AAC** scores lowest (3.904 MOS). It recorded 421 crashes and 169 timeouts, and does not support HE-AAC v2 Parametric Stereo.
- FDK-AAC recorded 8 runaways.

Decoder timings were measured concurrently and include contention. For profile and licensing guidance, see the [implementation comparison](/docs/comparison).

## AAC library size: FAAC and FAAD3 vs FDK-AAC {data-icon="microchip"}

The benchmark measures the ROM image of the library each codec is built into. FDK-AAC's figure covers its encoder and decoder together, so the fair comparison with FAAC and FAAD3 is the two added together. Apple AAC is bundled with the operating system, so it has no comparable size and is left out. Helix AAC, a decoder-only library, has a 121.4 KB default ROM image against 167.5 KB for FAAD3, but see its stability and HE-AAC v2 caveats [above](#aac-decoder-quality-and-speed).

| Library | Covers | ROM image (default build) |
| :--- | :--- | ---: |
| FAAC + FAAD3 | Encoder (101.7 KB) + decoder (167.5 KB), built separately | 269.2 KB |
| FFmpeg AAC | Encoder (154.5 KB) + decoder (238.4 KB) | 392.9 KB |
| FDK-AAC | Encoder and decoder | 940.5 KB |

With the default build, FAAC and FAAD3 together are under a third of FDK-AAC's size. FAAC and FAAD are also configurable: you can build only the encoder or only the decoder, and switch off HE-AAC, HE-AAC v2, DAB, or DRC. On an ESP32-S3 an AAC-LC-only decoder is 28.8 KB and an AAC-LC-only encoder is 37.4 KB. See [build options for ESP32](/docs/esp32-aac#trim-the-build). Desktop and ESP32 figures differ because they use different compilers, targets and option sets.

## How the measurements are made {data-icon="flask"}

- **Quality** is objective: ViSQOL scores speech and Zimtohrli scores music, each compared with the source. These are estimates, not listening-test results; [test audible quality](/docs/listening) yourself before relying on them. The suite covers mono speech, stereo music and multichannel audio at several sample rates, and also tracks difficult passages, transient timing and stereo image.
- **Bitrate** on the chart is the requested target bitrate, not the actual payload rate. Actual payload rates and bitrate accuracy are in the [full report](https://gist.github.com/nschimme/f126e982d84da89e930c8ea7deaf3505).
- **Speed and footprint** are throughput (audio duration per unit of processing time), peak process memory, and ROM image (`.text` + `.rodata` + `.data`, not the installed package size), recorded with each build's toolchain and settings.

These figures are for one machine. Measure your own build on your target device: throughput alone does not establish live-audio delay or power use. Definitions are in the [benchmark docs](https://github.com/nschimme/faac-benchmark/blob/master/docs/metrics.md), with the [test scenarios](https://github.com/nschimme/faac-benchmark/blob/master/docs/benchmarking.md) and [footprint checks](https://github.com/nschimme/faac-benchmark/blob/master/docs/footprint-gate.md).

## Tested versions {data-icon="flask"}

Run on November 8, 2026 (MacBook Pro M1, 32 GB). Throughput, peak RAM and ROM image are covered in the sections above; the [full leaderboard](https://gist.github.com/nschimme/f126e982d84da89e930c8ea7deaf3505) has per-scenario results, profile breakdowns and bitrate accuracy.

| Implementation | Tested version or build | Tested as |
| :--- | :--- | :--- |
| FAAC / FAAD3 | 3.0.0 (`17e956ec`) | Encoder / decoder |
| FDK-AAC | 1.0.9 (encoder), 2.0.0 (decoder) | Encoder / decoder |
| Apple AAC | 27.2 | Encoder / decoder |
| FFmpeg AAC | N-127192-gef52e1cc38, experimental NMR (encoder) | Encoder / decoder |
| Helix AAC | 1.0 | Decoder only |

The leaderboard covers 30 scenarios for FAAC, FDK-AAC, Apple and FFmpeg.

**Next:** [choose an encoder or decoder](/docs/comparison), or [test audible quality](/docs/listening).
