---
title: "Introducing FAAD3, FAAM and FAAR"
date: 2026-11-02
description: "FAAD3 is a rewritten AAC decoder that replaces FAAD2, alongside the new FAAM MP4 muxer and FAAR resampler. Includes a packager checklist for moving off FAAD2."
---

# Introducing FAAD3, FAAM and FAAR

The next FAAC release is a suite of four C11 libraries and command-line tools under **LGPL v2.1 or later**: **FAAC** encodes, **FAAD** decodes, **FAAM** muxes and demuxes MP4, and **FAAR** resamples. FAAD3, FAAM and FAAR are new in it, and you can build them from [source](/docs/install#build-the-current-libraries-and-tools-from-source) today. Each does one job, so a project can use one piece or all four.

## FAAD3: a decoder that replaces FAAD2

FAAD3 is a rewrite of the FAAD2 decoder as a C11 AAC decoder library and command-line tool. It decodes AAC-LC and HE-AAC v1, plus HE-AAC v2 when enabled in the build. The library decodes ADTS frames or raw AAC access units into PCM, and the host application owns the surrounding media pipeline. The `faad` tool provides the file-oriented workflow. The [FAAD overview](/docs/faad) describes supported audio and build options; the [CLI manual](/docs/faad-cli) and [C API reference](/docs/libfaad) cover each integration path.

**FAAD3 is LGPL; legacy FAAD2 is GPL.** FAAD3 is licensed under LGPL v2.1 or later, while legacy FAAD2 is GPL v2 or later, so closed-source applications can link FAAD3 under LGPL terms. See [software licenses and patent rights](/docs/comparison#software-licenses-and-patent-rights).

**FAAD3 does not keep FAAD2's `NeAACDec*` API or ABI.** A GPL v2 or later compatibility shim covers software that cannot port yet; see [Moving from FAAD2 to FAAD3](#moving-from-faad2).

## FAAM: MP4, M4A and M4B without another toolchain

Encoding AAC is only half the job: a player expects a proper M4A or M4B file, and most pipelines reach for a separate muxer to get one. FAAM is that piece, in the same dependency-free C. `faac` now writes MP4 through it, so a single encode produces a finished file, and gapless metadata is written for you: the encoder delay and padding go into the container, so tracks join without gaps. It can also extract audio without re-encoding and edit tags, cover art and audiobook chapters. See the [FAAM overview](/docs/faam), [CLI manual](/docs/faam-cli) and [C API](/docs/libfaam).

## FAAR: resampling that fits the pipeline

Encoders and devices want a fixed rate, and recordings rarely arrive at it. FAAR converts the sample rate of float PCM with Fast, Good and High profiles, so you trade CPU, memory and delay for rejection instead of accepting one fixed filter. With ABR or CBR, `faac` uses it to choose the output rate for you, with thresholds tuned on test clips: input above 48 kHz comes down to 48 or 44.1 kHz, and low-bitrate AAC-LC, and the lowest-bitrate 48 kHz stereo HE-AAC, drops to 32 kHz, where the encoder spends its bits better. VBR keeps the input rate. No extra tool or flag is needed, and `--rate keep` or a specific rate overrides the choice. FAAR's small C footprint also suits real-time and embedded use. See the [FAAR overview](/docs/faar), [CLI manual](/docs/faar-cli) and [C API](/docs/libfaar).

## Moving from FAAD2 to FAAD3 {#moving-from-faad2}

Two repositories divide the work:

- **[FreewareAdvancedAudio/faac](https://github.com/FreewareAdvancedAudio/faac)** builds `libfaad3`, `libfaac`, `libfaam`, `libfaar` and the `faac`, `faad`, `faam` and `faar` tools.
- **[FreewareAdvancedAudio/faad2](https://github.com/FreewareAdvancedAudio/faad2)** builds only the compatibility shim: `libfaad.so.2` with the legacy `NeAACDec*` API, which hands decoding to libfaad3 and resampling to libfaar. It ships no command-line tool and is GPL v2 or later.

**For distribution packagers**

1. **Point upstream** metadata at the FreewareAdvancedAudio organization.
2. **Package the `faac` source** (until a release is tagged, build from the repository) as the suite: `libfaad3`, `libfaac`, `libfaam` and `libfaar`, their headers (`faad3.h` and so on) and pkg-config modules, and the `faac`, `faad`, `faam` and `faar` tools and man pages.
3. **Package the `faad2` source** as the compatibility library, built against your packaged FAAC rather than its bundled `external/faac` submodule. That is the default (`FAAC_USE_BUNDLED_SOURCE=OFF`), and it needs a FAAC built with `-Ddecoder=true`. The shim depends on libfaad3 and libfaar, and its soname, header and pkg-config name differ from libfaad3's, so the two install side by side.
4. **Resolve the `faad` file overlap.** The `faad` binary and `faad.1` now come from the faac-built package, not the shim, so add Conflicts/Replaces to avoid two packages owning the same files. The new `faad` keeps option letters such as `-o`, `-w`, `-b`, `-f` and `-d`, but not their arguments: `-f` takes `wav` or `raw` instead of `1` or `2`, `-b` takes `16`, `24`, `32` or `32f` instead of `1` to `5`, and `-d` now defaults to mono and accepts a layout instead of always downmixing 5.1 to stereo. Check scripts that call `faad` before replacing the old package.
5. **Keep the shim until your reverse dependencies are ported,** then retire it. Use your distro's reverse-dependency tools to list packages that depend on `libfaad.so.2` or `faad2`.

**For applications and new code**

- **Apps on the legacy API:** they keep working with the shim, but output is not bit-identical to FAAD2. Test anything that relies on ADIF, LATM, DRM or the MAIN, LTP, SSR, LD and error-resilient profiles, which FAAD3 does not support. The [shim README](https://github.com/FreewareAdvancedAudio/faad2) lists every difference.
- **Porting:** follow the [porting notes](/docs/libfaad#porting-from-the-legacy-neaacdec-api).
- **New code:** link `libfaad3` directly, not the shim.
- **Checking a machine:** see [Which version did I get?](/docs/install#which-version-did-i-get).

## Benchmarks and documentation

For quality, speed, footprint and memory use, see the [benchmark results](/docs/aac-benchmark), which list the date and build behind each result. The [implementation comparison](/docs/comparison) covers profiles and licensing, including [license history](/docs/comparison#software-licenses-and-patent-rights). To get started, see [installation](/docs/install).
