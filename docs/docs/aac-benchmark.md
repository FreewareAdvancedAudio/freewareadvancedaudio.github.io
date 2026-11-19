---
title: "FAAC vs FDK-AAC: AAC Speed, Quality, Size"
description: "FAAC and FAAD3 benchmarked against FDK-AAC, Apple, FFmpeg, Ittiam and Helix: encoder speed, MOS quality from 16 to 320 kbps, memory and library size."
---

# FAAC & FAAD vs FDK-AAC: Speed, Quality, and Build Size

**Short answer:** in this benchmark, FAAC and FAAD3 are the fastest AAC encoder and decoder tested, and FAAC matches or beats FDK-AAC, Apple AAC, FFmpeg and Ittiam on objective quality at all but two bitrates (see below). Together they are under a third of the ROM size of FDK-AAC, and both can be trimmed further at build time.

- **Quality at a given bitrate:** see the [encoder quality chart](#aac-encoder-quality-faac-vs-fdk-aac-apple-aac-and-ffmpeg), which covers 16 to 320 kbps.
- **Speed and memory:** see [encoder speed, memory and bitrate accuracy](#aac-encoder-speed-memory-and-bitrate-accuracy) and [decoder quality and speed](#aac-decoder-quality-and-speed).
- **Size and microcontrollers:** see [build size](#aac-library-size-faac-and-faad3-vs-fdk-aac) and [AAC on ESP32](/docs/esp32-aac), including the [build options](/docs/esp32-aac#trim-the-build) that shrink FAAC and FAAD to fit.
- **Choosing by profile, license or patents:** use the [implementation comparison](/docs/comparison). This page covers measurements only.

**Who ran this:** the benchmark is run by the FAAC project on its own [benchmark suite](https://github.com/nschimme/faac-benchmark), so read the results with that in mind. Every desktop figure is from one run on **November 18, 2026** on a **MacBook Pro M1, 32 GB**. Encoder and decoder results are separate sections of one generated leaderboard, not a single head-to-head.

## AAC encoder quality: FAAC vs FDK-AAC, Apple AAC, FFmpeg, and Ittiam {data-icon="chart-line"}

The chart plots average MOS (a 1.0–5.0 objective estimate, where 1.0 is poor and 5.0 is transparent; not a listening test) against requested bitrate, 16–320 kbps, for 48 kHz stereo. Each encoder is shown at its higher-scoring profile (AAC-LC or HE-AAC v1) at each bitrate.

<BenchmarkShowcase view="quality" />

**Where FAAC leads and where it doesn't:**

- **Highest at 48 kHz stereo** at every bitrate but 192 and 320 kbps, where Apple leads by at most 0.003 MOS. That gap is negligible: every encoder scores 4.9–5.0 there.
- **24 kHz mono speech:** FAAC leads by about 0.3 MOS at 28 and 32 kbps (4.663 and 4.728, against 4.337 and 4.435 for the next best).

Gaps are large at 16–24 kbps. From 32 kbps up, the HE-AAC encoders stay within about 0.15 MOS of FAAC; FFmpeg, which has no HE-AAC, trails well behind through 48 kbps. Drag the marker on the chart to see the exact scores at any bitrate. At 48 kbps, for example, FAAC scores 4.348, FDK-AAC 4.267, Apple AAC 4.215, Ittiam 4.201 and FFmpeg 3.741.

## AAC encoder speed, memory and bitrate accuracy {data-icon="gauge-high"}

<BenchmarkShowcase view="resources" />

Ranked by first-percentile MOS (the score 99% of clips meet).

| Encoder | 1st-percentile MOS | Overall MOS | Speed (× realtime) | Bitrate error | Peak RAM | Extra bitrate, LC (BD-rate) |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| **FAAC** | **2.773** | **4.478** | **749** | **0.2%** | **2.5 MB** | baseline |
| FDK-AAC | 2.509 | 4.411 | 190 | 1.1% | 3.2 MB | +45% |
| Ittiam AAC | 2.450 | 4.343 | 95 | 1.0% | 61.0 MB | +46% |
| FFmpeg AAC | 1.970 | 4.150 | 58 | 14.3% | 17.5 MB | +36% |
| Apple AAC | 1.249 | 4.223 | 178 | 1.0% | 8.5 MB | +50% |

Apple and Ittiam ran 28 of 30 scenarios (no 5.1). The last column is how much more bitrate an encoder needs than FAAC for the same MOS on AAC-LC, widest at 64 kbps and below, where most encoders would use HE-AAC instead.

FAAC encodes 3.9× faster than FDK-AAC, 4.2× Apple AAC, 7.9× Ittiam and 12.9× FFmpeg.

## AAC decoder quality and speed {data-icon="headphones"}

<BenchmarkShowcase view="decoder" />

FAAD3 is the fastest decoder tested and ties the top decoded quality.

| Decoder | Overall MOS | Speed | Peak RAM | Mean SNR | Failures |
| :--- | ---: | ---: | ---: | ---: | :--- |
| **FAAD3** | **4.048** | **2,242×** | 3.0 MB | **17.0 dB** | None |
| FFmpeg AAC | **4.048** | 602× | 16.6 MB | **17.0 dB** | None |
| FDK-AAC | 4.043 | 915× | 7.0 MB | **17.0 dB** | 36 runaways |
| Ittiam AAC | 3.975 | 155× | 26.3 MB | 15.9 dB | 916 crashes |
| Apple AAC | 3.950 | 1,171× | 8.0 MB | 13.9 dB | None |
| Helix AAC | 3.822 | 1,031× | **1.9 MB** | 14.4 dB | 510 crashes, 102 timeouts |

- **Speed:** FAAD3 is 2.5× FDK-AAC, 1.9× Apple AAC, 3.7× FFmpeg and 14.4× Ittiam.
- **Quality:** FAAD3, FFmpeg and FDK-AAC are effectively tied. At 48 kHz stereo, FAAD3 and FFmpeg match within about 0.003 MOS, and FDK-AAC does too on AAC-LC. On HE-AAC v1, FDK-AAC trails by up to about 0.03 and Ittiam by up to about 0.07.

Helix also does not support HE-AAC v2 Parametric Stereo. Decoder timings were measured concurrently and include contention. For profile and licensing guidance, see the [implementation comparison](/docs/comparison).

## AAC library size: FAAC and FAAD3 vs FDK-AAC {data-icon="microchip"}

The benchmark measures the ROM image of the library each codec is built into. FDK-AAC's figure covers its encoder and decoder together, so the fair comparison with FAAC and FAAD3 is the two added together. Apple AAC is bundled with the operating system, so it has no comparable size and is left out. Helix AAC, a decoder-only library, has a 121.4 KB default ROM image against 168.2 KB for FAAD3, but see its stability and HE-AAC v2 caveats [above](#aac-decoder-quality-and-speed).

| Library | Covers | ROM image (default build) |
| :--- | :--- | ---: |
| FAAC + FAAD3 | Encoder (104.3 KB) + decoder (168.2 KB), built separately | 272.5 KB |
| FFmpeg AAC | Encoder (154.5 KB) + decoder (238.4 KB) | 392.9 KB |
| FDK-AAC | Encoder and decoder | 940.5 KB |
| Ittiam AAC | Encoder (1,794.8 KB) + decoder (about 1.9 MB) | about 3.7 MB |

With the default build, FAAC and FAAD3 together are under a third of FDK-AAC's size. FAAC and FAAD are also configurable: you can build only the encoder or only the decoder, and switch off HE-AAC, HE-AAC v2, DAB, or DRC. On an ESP32-S3 an AAC-LC-only decoder is 28.8 KB and an AAC-LC-only encoder is 37.4 KB. See [build options for ESP32](/docs/esp32-aac#trim-the-build). Desktop and ESP32 figures differ because they use different compilers, targets and option sets.

## How the measurements are made {data-icon="flask"}

- **Quality** is objective: ViSQOL scores speech and Zimtohrli scores music, each compared with the source. These are estimates, not listening-test results; [test audible quality](/docs/listening) yourself before relying on them. The suite covers mono speech, stereo music and multichannel audio at several sample rates, and also tracks difficult passages, transient timing and stereo image.
- **Bitrate** on the chart is the requested target bitrate, not the actual payload rate. Actual payload rates and bitrate accuracy are in the [full report](https://github.com/nschimme/faac-benchmark/discussions/127).
- **Speed and footprint** are throughput (audio duration per unit of processing time), peak process memory, and ROM image (`.text` + `.rodata` + `.data`, not the installed package size), recorded with each build's toolchain and settings.

These figures are for one machine. Measure your own build on your target device: throughput alone does not establish live-audio delay or power use. Definitions are in the [benchmark docs](https://github.com/nschimme/faac-benchmark/blob/master/docs/metrics.md), with the [test scenarios](https://github.com/nschimme/faac-benchmark/blob/master/docs/benchmarking.md) and [footprint checks](https://github.com/nschimme/faac-benchmark/blob/master/docs/footprint-gate.md).

## Tested versions {data-icon="flask"}

Run on November 18, 2026 (MacBook Pro M1, 32 GB). Throughput, peak RAM and ROM image are covered in the sections above; the [full leaderboard](https://github.com/nschimme/faac-benchmark/discussions/127) has per-scenario results, profile breakdowns and bitrate accuracy.

| Implementation | Tested version or build | Tested as |
| :--- | :--- | :--- |
| FAAC / FAAD3 | 3.0.0 (`63f5a05b`; encoder built with `-Dencoder-ps=true`) | Encoder / decoder |
| FDK-AAC | 1.0.9 (encoder), 2.0.0 (decoder) | Encoder / decoder |
| Apple AAC | 27.2.1 | Encoder / decoder |
| FFmpeg AAC | N-127192-gef52e1cc38, experimental NMR (encoder) | Encoder / decoder |
| Ittiam AAC (libxaac) | 2.0 (encoder), 1.41 (decoder) | Encoder / decoder |
| Helix AAC | 1.0 | Decoder only |

The leaderboard covers 30 scenarios for FAAC, FDK-AAC and FFmpeg, and 28 for Apple (5.1 encoding fails) and Ittiam (no 5.1 support).

**Next:** [choose an encoder or decoder](/docs/comparison), or [test audible quality](/docs/listening).
