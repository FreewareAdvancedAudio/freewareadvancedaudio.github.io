---
title: FAAD AAC Decoder Library Overview
description: FAAD3 is an LGPL v2.1+ C11 AAC decoder for AAC-LC and HE-AAC. Explore build-dependent HE-AAC v2 support, library and CLI use, and migration from FAAD2.
---

# FAAD AAC Decoder and C Library

**FAAD (Freeware Advanced Audio Decoder)** is a C11 AAC decoder library and command-line tool. FAAD3, described here, is licensed under **LGPL v2.1 or later**. Use `faad` to convert supported AAC files to PCM audio, or integrate `libfaad` to decode AAC frames inside an application.

::: info License depends on the version
FAAD3 (this library) is **LGPL v2.1+**. Legacy FAAD2, which most package managers ship as `faad2`, is **GPL v2+**, and so is the FAAD2 compatibility shim. This project no longer supports FAAD2. To link from closed-source code, use FAAD3. See [which version did I get](/docs/install#which-version-did-i-get).
:::

## AAC decoding capabilities

FAAD supports **AAC-LC**, **HE-AAC v1**, and **HE-AAC v2 Parametric Stereo** when enabled in the build; it does not support xHE-AAC. The library decodes AAC frames supplied by the application and returns PCM, while the command-line tool handles file conversion, including supported container input. See the [supported streams and build requirements](/docs/libfaad#supported-streams) for details.

## Choose how to use FAAD

| If you want to… | Go to… |
| :--- | :--- |
| Decode files from a terminal | [FAAD command-line manual](/docs/faad-cli) |
| Embed AAC decoding in a C application | [libfaad C API reference](/docs/libfaad) |
| Build FAAD from source | [Installation guide](/docs/install) |
| Port an application from FAAD2 | [FAAD2 migration notes](/docs/libfaad#porting-from-the-legacy-neaacdec-api) |
| Compare profiles, implementations, and licenses | [Encoder and decoder comparison](/docs/comparison) |

## Evaluate decoder performance and quality

See the [decoder results](/docs/aac-benchmark#aac-decoder-quality-and-speed) for decoder measurements and their build notes. For ESP32-class decoding, including HE-AAC v2 on the ESP32-S3, see [AAC on ESP32](/docs/esp32-aac). Use the [implementation comparison](/docs/comparison) to compare profiles and licensing.
