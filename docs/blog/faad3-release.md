---
title: "Introducing FAAD3, FAAM and FAAR"
date: 2026-11-02
description: "FAAD3 is a rewritten AAC decoder that replaces FAAD2. It joins the new FAAM MP4 muxer and FAAR resampler alongside FAAC: LGPL C11 libraries with CLI tools."
---

# Introducing FAAD3, FAAM and FAAR

The next FAAC release is a suite of four C11 libraries and command-line tools under **LGPL v2.1 or later**: **FAAC** encodes, **FAAD** decodes, **FAAM** muxes and demuxes MP4, and **FAAR** resamples. FAAD3, FAAM and FAAR are new in it, and you can build them from [source](/docs/install#build-the-current-libraries-and-tools-from-source) today. Each does one job, so a project can use one piece or all four.

## FAAD3: a decoder that replaces FAAD2

FAAD3 is a rewrite of the FAAD2 decoder as a C11 AAC decoder library and command-line tool. The library decodes ADTS frames or raw AAC access units into PCM, and the host application owns the surrounding media pipeline. The `faad` tool provides the file-oriented workflow. The [FAAD overview](/docs/faad) describes supported audio and build options; the [CLI manual](/docs/faad-cli) and [C API reference](/docs/libfaad) cover each integration path.

**FAAD3 is LGPL; legacy FAAD2 is GPL.** FAAD3 is licensed under LGPL v2.1 or later, while legacy FAAD2 is GPL v2 or later, so closed-source applications can link FAAD3 under LGPL terms. See [software licenses and patent rights](/docs/comparison#software-licenses-and-patent-rights).

**FAAD3 does not keep FAAD2's `NeAACDec*` API or ABI.** For applications that cannot port yet, the [FAAD2 compatibility library](https://github.com/FreewareAdvancedAudio/faad2) is now a shim that provides the legacy API on top of FAAD3. The shim is GPL v2 or later, so port to FAAD3 directly if you need LGPL terms. The API mapping, supported streams and the shim's limits are in the [porting notes](/docs/libfaad#porting-from-the-legacy-neaacdec-api).

## FAAM: MP4, M4A and M4B without another toolchain

Encoding AAC is only half the job: a player expects a proper M4A or M4B file, and most pipelines reach for a separate muxer to get one. FAAM is that piece, in the same dependency-free C. `faac` now writes MP4 through it, so a single encode produces a finished file, and gapless metadata is written for you: the encoder delay and padding go into the container, so tracks join without gaps. It can also extract audio without re-encoding and edit tags, cover art and audiobook chapters. See the [FAAM overview](/docs/faam), [CLI manual](/docs/faam-cli) and [C API](/docs/libfaam).

## FAAR: resampling that fits the pipeline

Encoders and devices want a fixed rate, and recordings rarely arrive at it. FAAR converts the sample rate of float PCM with Fast, Good and High profiles, so you trade CPU, memory and delay for rejection instead of accepting one fixed filter. `faac` resamples through it, so converting 96 kHz material to 48 kHz no longer needs an extra tool, and its small C footprint suits real-time and embedded use. See the [FAAR overview](/docs/faar), [CLI manual](/docs/faar-cli) and [C API](/docs/libfaar).

## Follow the evidence

This post is dated, so it quotes no measurements. The [benchmark results page](/docs/aac-benchmark) is the reference for quality, speed, footprint and memory use, with the date and builds behind each result. Use the [implementation comparison](/docs/comparison) for profile and licensing guidance, and see [software licenses and patent rights](/docs/comparison#software-licenses-and-patent-rights) for license history. To install the tools and libraries, visit [installation](/docs/install).
