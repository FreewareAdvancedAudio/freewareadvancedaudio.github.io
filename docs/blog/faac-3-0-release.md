---
title: "FAAC 3.0 and FAAD2 2.12.0 are released"
date: 2026-11-18
description: "FAAC 3.0 release notes: the new libfaac ABI, changed -q and eight-channel behavior, HE-AAC v2 and encoder improvements, plus what FAAD2 2.12.0 now is."
---

# FAAC 3.0 and FAAD2 2.12.0 are released

[FAAC 3.0](https://github.com/FreewareAdvancedAudio/faac/releases/tag/faac-3.0) is out. It is the first release of the suite described in [Introducing FAAD3, FAAM and FAAR](/blog/faad3-release), all under **LGPL v2.1 or later**. Windows builds of the tools and libraries are attached to the release.

## Breaking changes

- **libfaac has a new ABI (3).** `faac_params` takes a whole-stream bitrate with explicit ABR, VBR and CBR modes, channels, stereo mode, stream format and layouts, and float input is unity full scale. Code built for ABI 2 recompiles but misbehaves, so rebuild it against the new header. Each shared library now has its own ABI version, separate from the release number.
- **`-q` values are not comparable with 2.2.** The same `-q` now gives a different bitrate.
- **Eight-channel decoding changed.** `faad` reads channelConfiguration 7 as 7.1 wide, as Apple's decoder and FDK's do. Eight-channel streams written by 2.2 and earlier come out with their pairs moved, so encode them again from the source.

## What is new

FAAD3, FAAM and FAAR, and why FAAD3 replaces FAAD2, are covered in [Introducing FAAD3, FAAM and FAAR](/blog/faad3-release). Beyond those:

- **HE-AAC v2 with Parametric Stereo** is available behind `-Dencoder-ps`, which is off by default. HE-AAC v1 is chosen over a wider range of bitrates under automatic profile selection.
- **Encoder quality and rate control.** A Kaiser-Bessel Derived window for long blocks, retuned stereo masking and onset handling, and CBR that keeps the exact nominal rate and fits every frame within its cap, down to the size of an empty frame.
- **Dynamic range control** in both directions: `faac --drc` writes it from loudness, and `faad` applies it.
- **Multichannel.** PCE and 7.1 handling, and `faad --downmix` to 3.0, 4.0, 5.0 and 5.1 as well as mono and stereo.
- **Build.** Options to leave out decoder, muxer and resampler features, and an installed CMake package with `faac::` targets.

The full list is in the [changelog](/docs/changes).

## Leaderboard

We ran the project benchmark on this release, with the optional Parametric Stereo encoder enabled in the FAAC build. The results are in the [leaderboard discussion](https://github.com/nschimme/faac-benchmark/discussions/127), and the figures on the [benchmark page](/docs/aac-benchmark) come from the same run. These are objective scores computed by software, not listening tests, and the run covers a different scenario set from the previous leaderboard, so compare the two with care.

## FAAD2 2.12.0

[FAAD2 2.12.0](https://github.com/FreewareAdvancedAudio/faad2/releases/tag/2.12.0) is a thin compatibility library over FAAD3. It keeps the `libfaad.so.2` ABI so most existing software keeps working. It drops the Main, LTP, SSR, LD and ER profiles, DRM, fixed-point decoding, LATM, ADIF and raw AAC without an AudioSpecificConfig, and its output is not bit-identical to FAAD2. It has no command-line tool and no Windows download; the `faad` tool comes from FAAC 3.0. If you maintain a package or an application, read [Moving from FAAD2 to FAAD3](/docs/faad#moving-from-faad2).

## Get it

See the [install page](/docs/install) for downloads and building from source. Bug reports and reproducible findings are welcome in the [issue tracker](https://github.com/FreewareAdvancedAudio/faac/issues).
