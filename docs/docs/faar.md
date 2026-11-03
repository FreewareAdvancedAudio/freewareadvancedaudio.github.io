---
title: FAAR Sample Rate Converter
description: Understand when to use FAAR for PCM sample-rate conversion, which quality profile to choose, and where to find the CLI and C API references.
---

# FAAR Sample Rate Converter

**FAAR (Freeware Advanced Audio Resampler)** changes the sample rate of PCM audio. Use it to match a device or encoder, convert high-rate recordings to 44.1 or 48 kHz, or produce a dithered integer file. It does not play audio, decode AAC, or write MP4 files. Both the library and the command-line tool are licensed under **LGPL v2.1 or later**.

## When to use FAAR

- You have PCM audio at one rate and need another, such as 96 kHz to 48 kHz.
- A downstream encoder, stream, or device expects a fixed rate.
- You need offline conversion with a known quality, memory, and delay trade-off.
- You need a small C resampler for real-time or embedded use.

The `faar` CLI handles WAV and raw PCM. `libfaar` processes interleaved 32-bit float PCM at unity full scale and leaves file and container I/O to the application.

## What to expect

**Good** is the default and the right choice for most conversions. **Fast** saves memory, delay, and some CPU; **High** adds rejection for 24-bit or float work but costs more CPU and about 28 ms more lookahead. Add dither only when reducing to integer output. Conversion is not lossless, and FAAR cannot restore missing bandwidth, remove clipping, or repair a bad source. Applications that splice or loop resampled audio must account for the filter lookahead.

## Documentation

- [FAAR CLI manual](/docs/faar-cli) for commands, options, and examples.
- [libfaar C API](/docs/libfaar) for the quality table, streaming model, and build options.
- [Installation guide](/docs/install) to build FAAR from source.
