---
title: FAAC AAC Encoder Library Overview
description: FAAC is an LGPL v2.1+ C AAC encoder for AAC-LC, HE-AAC v1, and build-dependent HE-AAC v2. Explore its library and CLI, supported output, and benchmark results.
---

# FAAC AAC Encoder and C Library

**FAAC (Freeware Advanced Audio Coder)** encodes PCM audio as MPEG-2 or MPEG-4 AAC. Use the C library to add encoding to an application, or use the `faac` command-line tool for file conversion. Both are licensed under **LGPL v2.1 or later**.

## AAC encoding capabilities

FAAC supports **AAC-LC** and **HE-AAC v1** encoding, and **HE-AAC v2** (SBR plus Parametric Stereo) when built with `encoder-ps`. HE-AAC v2 takes stereo input at 32 kHz or above. The library accepts PCM and returns AAC access units for an application to mux into its chosen container. The command-line tool supports common AAC file-conversion workflows, including M4A output. FAAC does not encode xHE-AAC.

## Choose how to use FAAC

| If you want to… | Go to… |
| :--- | :--- |
| Convert audio files from a terminal | [FAAC command-line manual](/docs/faac-cli) |
| Embed AAC encoding in a C application | [libfaac C API reference](/docs/libfaac) |
| Build FAAC from source | [Installation guide](/docs/install) |
| Try encoding without installing software | [Browser converter](/playground) |

## Evaluate quality and resource use

Published results compare FAAC with other AAC encoders for quality, throughput, memory use, and whole-library build size. FAAC is also configurable at build time, so you can ship only the features you need. Results depend on the tested build and hardware; objective quality scores are not listening-test results. See the [benchmark methods, results, and tested builds](/docs/aac-benchmark).

For ESP32-class encoding, see [AAC on ESP32](/docs/esp32-aac). For profile support, competing implementations, and licensing context, see the [encoder comparison](/docs/comparison).
