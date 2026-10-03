---
title: AAC Benchmarks — FAAC & FAAD Speed, Size & Quality
description: "Published AAC encoder and decoder benchmarks: FAAC versus FDK-AAC, FFmpeg, and Apple; FAAD2 and FAAD3 versus Helix. Compare throughput, footprint, and low-bitrate quality."
---

# AAC Benchmarks: Speed, Size, and Quality

Compare **measured encoding speed, code footprint, low-bitrate quality, and decoder performance**. The results below are a published benchmark snapshot; the methods explain how these measurements guide FAAC tuning.

## FAAC encoder speed and footprint {data-icon="gauge-high"}

<BenchmarkShowcase view="resources" />

**Benchmark snapshot · September 29, 2026 · MacBook Pro M1, 32 GB.** The aggregate report covers 27 scenarios. Tested builds: FAAC 2.2.0 (`6acbe23a`), FDK-AAC 2.0.3 through fdkaac 1.0.9, Apple AAC 27.0, and FFmpeg `g3fc4f99a79` with experimental NMR. [Published measurements](https://github.com/nschimme/faac-benchmark/discussions/90).

## Low-bitrate quality: FAAC vs FFmpeg {data-icon="headphones"}

See FAAC's HE-AAC v1 results against FFmpeg's native LC encoder, or select LC vs LC for a same-profile comparison.

<BenchmarkShowcase view="quality" />

Average scores from the same snapshot. See the report for [profile breakdowns and bitrate accuracy](https://github.com/nschimme/faac-benchmark/discussions/90).

## Decoder performance: FAAD vs Helix and others {data-icon="circle-play"}

<BenchmarkShowcase view="decoder" />

The same [published report](https://github.com/nschimme/faac-benchmark/discussions/90#decoder-leaderboard) compares **released FAAD2** and the **FAAD3 development engine** with other AAC decoders.

| Decoder | Throughput ↑ | Code footprint ↓ | Peak RAM ↓ |
| :--- | ---: | ---: | ---: |
| **FAAD2 2.11.3** | **376.8×** | **296.3 KB** | **2.1 MB** |
| **FAAD3 (`f9fbcb76`)** | **490.3×** | **136.0 KB** | **2.8 MB** |
| Helix AAC 1.0 (LibHelix) | 426.1× | 121.4 KB | 1.9 MB |
| FDK AAC 2.0.0 | 344.1× | 940.5 KB | 4.2 MB |
| FFmpeg AAC (`g3fc4f99a79`) | 135.1× | 274.5 KB | 16.8 MB |
| Apple AAC 27.0 | 174.4× | 100.3 KB | 8.3 MB |

**The tradeoff:** FAAD3 was faster and used less code storage than FAAD2, with higher peak RAM. Helix was faster and smaller than FAAD2; FAAD3 was faster than Helix, with a larger footprint.

Helix lacks HE-AAC v2 Parametric Stereo (PS) support. For FPU versus fixed-point hardware guidance and release requirements, see [choosing a decoder](/docs/comparison#choose-a-decoder-for-your-hardware).

## How audio quality is tuned {data-icon="headphones"}

The [FAAC benchmark suite](https://github.com/nschimme/faac-benchmark) evaluates mono speech, stereo music, and multichannel audio across sample rates and bitrates. Fine-tuning considers difficult passages alongside average quality.

- **Speech and music quality:** ViSQOL and Zimtohrli estimate changes relative to the source.
- **Difficult passages:** lower-tail scores help expose regressions hidden by an average.
- **Sharp attacks:** onset timing measurements track changes around percussion and plucked strings.
- **Stereo image:** coherence measurements track changes between the left and right channels.
- **Frequency balance:** spectral diagnostics locate regions where distortion changes.

These measurements guide investigation; objective scores do not establish audible preference.

## How bitrate efficiency is checked {data-icon="sliders"}

Quality comparisons use the **actual AAC payload bitrate**, excluding M4A headers and metadata. This prevents extra bits or container overhead from disguising a rate-control difference.

Rate–quality curves and BD-rate analysis compare the bits needed to reach the same objective quality. Sample-rate and channel groups stay separate, as do AAC-LC and HE-AAC v1. ABR, VBR, and CBR are evaluated as distinct modes.

## How speed and footprint are checked {data-icon="microchip"}

Benchmarking tracks three resource costs:

- **Throughput:** audio duration encoded per unit of processing time.
- **Code footprint:** executable code, constant tables, and initialized data.
- **Memory:** writable static data and peak process memory.

Baseline and candidate builds record their toolchain and settings. Parameter sweeps, decode validation, and regression reports help weigh a tuning change's quality gain against its processing and storage cost.

For your application, measure the selected build on the target device. Encoding throughput alone does not establish live-audio delay or power consumption.

## Benchmark methodology {data-icon="code"}

The benchmark documentation defines the [quality and efficiency metrics](https://github.com/nschimme/faac-benchmark/blob/master/docs/metrics.md), [test scenarios](https://github.com/nschimme/faac-benchmark/blob/master/docs/benchmarking.md), and [footprint checks](https://github.com/nschimme/faac-benchmark/blob/master/docs/footprint-gate.md).

**Next:** [choose an encoder or decoder](/docs/comparison), or [test audible quality](/docs/listening).
