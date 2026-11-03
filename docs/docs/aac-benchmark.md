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

**Who ran this:** the benchmark is run by the FAAC project on its own [benchmark suite](https://github.com/nschimme/faac-benchmark), so read the results with that in mind. Every desktop figure is from one run on **October 28, 2026** on a **MacBook Pro M1, 32 GB**. Encoder and decoder results are separate sections of one generated leaderboard, not a single head-to-head.

## AAC encoder quality: FAAC vs FDK-AAC, Apple AAC, and FFmpeg {data-icon="chart-line"}

The chart plots average MOS (a 1.0–5.0 objective estimate, where 1.0 is poor and 5.0 is transparent; not a listening test) against requested bitrate, 16–320 kbps, for 48 kHz stereo. Each encoder is shown at its higher-scoring profile (AAC-LC or HE-AAC v1) at each bitrate.

<BenchmarkShowcase view="quality" />

**Where FAAC leads and where it doesn't (48 kHz stereo, best profile per encoder).** FAAC has the highest average MOS at 16–24 and 48–128 kbps. It trails Apple and FDK-AAC by at most about 0.02 MOS at 32 kbps and FDK-AAC by 0.006 at 40 kbps, and trails Apple by at most 0.008 MOS at 160–320 kbps. At 48 kbps, HE-AAC v1 is the best profile for FAAC, FDK-AAC and Apple AAC: 4.297 for FAAC, 4.267 for FDK-AAC and 4.262 for Apple AAC. FFmpeg's best at 48 kbps is AAC-LC, at 3.741.

Across all 35 scenarios (Apple completed 29 of them), FAAC also ranks first on both overall and first-percentile MOS (the score that 99% of clips meet), with 4.541 and 2.785. Per-scenario results, profile breakdowns and bitrate accuracy are in the [full report](https://gist.github.com/nschimme/003da901f4b681f3ee4f679b07d2e31e).

## AAC encoder speed and memory {data-icon="gauge-high"}

<BenchmarkShowcase view="resources" />

FAAC is the fastest encoder in the comparison at 4.3× FDK-AAC throughput. It also has the lowest peak RAM of the four encoders: 2.6 MB, versus 3.3 MB for FDK-AAC, 8.3 MB for Apple AAC and 18.0 MB for FFmpeg.

## AAC decoder quality and speed {data-icon="headphones"}

<BenchmarkShowcase view="decoder" />

FAAD3 is the fastest decoder tested, at 2.4× FDK-AAC throughput and 1.85–3.66× Apple and FFmpeg. Across all scenarios its overall MOS (4.193) ties FFmpeg and is within 0.005 of FDK-AAC (4.188), and at 48 kHz stereo FAAD3, FFmpeg, Apple and FDK match within about 0.003 MOS (LC and HE-v1). Decoded quality among FAAD3, FFmpeg and FDK-AAC is therefore a tie, and the practical differences are speed, memory and size. Peak RAM is 3.0 MB for FAAD3, versus 7.4 MB for FDK-AAC, 7.8 MB for Apple AAC and 17.0 MB for FFmpeg; only Helix AAC is lower, at 1.9 MB.

Apple AAC scores lower across all scenarios (3.944 overall MOS, 12.5 dB mean SNR). Helix AAC scores lowest (3.575 overall MOS), recorded 421 crashes and 169 timeouts, and does not support HE-AAC v2 Parametric Stereo. FDK recorded 10 runaways. Decoder timings were measured concurrently and include contention. For profile and licensing guidance, see the [implementation comparison](/docs/comparison).

## AAC library size: FAAC and FAAD3 vs FDK-AAC {data-icon="microchip"}

The benchmark measures the ROM image of the library each codec is built into. FDK-AAC's figure covers its encoder and decoder together, so the fair comparison with FAAC and FAAD3 is the two added together. Apple AAC is bundled with the operating system, and FFmpeg's figure is the `ffmpeg` command-line executable, not the libraries that hold its AAC codecs, so neither is a comparable size and both are left out. Helix AAC, a decoder-only library, has a 121.4 KB default ROM image against 168.1 KB for FAAD3, but see its stability and HE-AAC v2 caveats [above](#aac-decoder-quality-and-speed).

| Library | Covers | ROM image (default build) |
| :--- | :--- | ---: |
| FAAC + FAAD3 | Encoder (99.9 KB) + decoder (168.1 KB), built separately | 268.0 KB |
| FDK-AAC | Encoder and decoder | 940.5 KB |

With the default build, FAAC and FAAD3 together are under a third of FDK-AAC's size. FAAC and FAAD are also configurable: you can build only the encoder or only the decoder, and switch off HE-AAC, HE-AAC v2, DAB, or DRC. On an ESP32-S3 an AAC-LC-only decoder is 28.8 KB and an AAC-LC-only encoder is 37.4 KB. See [build options for ESP32](/docs/esp32-aac#trim-the-build). Desktop and ESP32 figures differ because they use different compilers, targets and option sets.

## How the measurements are made {data-icon="flask"}

- **Quality** is objective: ViSQOL scores speech and Zimtohrli scores music, each compared with the source. These are estimates, not listening-test results; [test audible quality](/docs/listening) yourself before relying on them. The suite covers mono speech, stereo music and multichannel audio at several sample rates, and also tracks difficult passages, transient timing and stereo image.
- **Bitrate** on the chart is the requested target bitrate, not the actual payload rate. Actual payload rates and bitrate accuracy are in the [full report](https://gist.github.com/nschimme/003da901f4b681f3ee4f679b07d2e31e).
- **Speed and footprint** are throughput (audio duration per unit of processing time), peak process memory, and ROM image (`.text` + `.rodata` + `.data`, not the installed package size), recorded with each build's toolchain and settings.

These figures are for one machine. Measure your own build on your target device: throughput alone does not establish live-audio delay or power use. Definitions are in the [benchmark docs](https://github.com/nschimme/faac-benchmark/blob/master/docs/metrics.md), with the [test scenarios](https://github.com/nschimme/faac-benchmark/blob/master/docs/benchmarking.md) and [footprint checks](https://github.com/nschimme/faac-benchmark/blob/master/docs/footprint-gate.md).

## Tested versions {data-icon="flask"}

Run on October 28, 2026 (MacBook Pro M1, 32 GB). Throughput, peak RAM and ROM image are covered in the sections above; the [full leaderboard](https://gist.github.com/nschimme/003da901f4b681f3ee4f679b07d2e31e) has per-scenario results, profile breakdowns and bitrate accuracy.

| Implementation | Tested version or build | Tested as |
| :--- | :--- | :--- |
| FAAC / FAAD3 | 3.0.0 (`ecc245c0`) | Encoder / decoder |
| FDK-AAC | 1.0.9 (encoder), 2.0.0 (decoder) | Encoder / decoder |
| Apple AAC | 27.2 | Encoder / decoder |
| FFmpeg AAC | N-127192-gef52e1cc38, experimental NMR (encoder) | Encoder / decoder |
| Helix AAC | 1.0 | Decoder only |

The leaderboard covers 35 scenarios for FAAC, FDK-AAC and FFmpeg; Apple's encoder completed 29 of 35 after 6 encoding failures.

**Next:** [choose an encoder or decoder](/docs/comparison), or [test audible quality](/docs/listening).
