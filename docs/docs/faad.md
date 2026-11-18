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
| Port an application from FAAD2 | [API mapping](/docs/libfaad#porting-from-the-legacy-neaacdec-api) and [moving from FAAD2 to FAAD3](#moving-from-faad2) |
| Compare profiles, implementations, and licenses | [Encoder and decoder comparison](/docs/comparison) |

## Evaluate decoder performance and quality

See the [decoder results](/docs/aac-benchmark#aac-decoder-quality-and-speed) for decoder measurements and their build notes. For ESP32-class decoding, including HE-AAC v2 on the ESP32-S3, see [AAC on ESP32](/docs/esp32-aac). Use the [implementation comparison](/docs/comparison) to compare profiles and licensing.

## Moving from FAAD2 to FAAD3 {#moving-from-faad2}

No flag day: FAAD3 and the shim install side by side.

| | FAAD2 compatibility shim | FAAD3 |
|---|---|---|
| Source repo | [FreewareAdvancedAudio/faad2](https://github.com/FreewareAdvancedAudio/faad2) | [FreewareAdvancedAudio/faac](https://github.com/FreewareAdvancedAudio/faac) |
| Libraries | `libfaad.so.2`, `libfaad_drm.so.2` | `libfaad3` |
| Header | `neaacdec.h`, `faad.h` | `faad3.h` |
| pkg-config | `faad2` | `faad3` |
| License | GPL v2 or later | LGPL v2.1 or later |
| CLI tool | none | `faad` |
| Delegates to | libfaad3 (decoding) and libfaar (resampling) | n/a |
| Also builds | nothing | `libfaac`, `libfaam`, `libfaar` and the `faac`, `faam`, `faar` tools |

### For distribution packagers

1. **Add FAAD3 alongside.** Point upstream metadata at the FreewareAdvancedAudio organization. Package the `faac` source (until a release is tagged, build from the repository) as the suite: `libfaad3`, `libfaac`, `libfaam` and `libfaar`, their headers and pkg-config modules, and the four tools and man pages.
2. **Replace the `faad2` source with the shim.** Build it against your packaged FAAC rather than its bundled `external/faac` submodule. That is the default (`FAAC_USE_BUNDLED_SOURCE=OFF`), and it needs a FAAC built with `-Ddecoder=true`. The shim depends on libfaad3 and libfaar. Like FAAD2, it installs both `libfaad.so.2` and `libfaad_drm.so.2`, so existing reverse dependencies keep working. Output is not bit-identical to FAAD2, and DRM decoding is not implemented in either library.
3. **Resolve the `faad` file overlap.** The `faad` binary and `faad.1` now come from the faac-built package, not the shim, so add Conflicts/Replaces to avoid two packages owning the same files. The new `faad` keeps option letters such as `-o`, `-w`, `-b`, `-f` and `-d`, but changes these arguments:

   | Option | FAAD2 | FAAD3 |
   |---|---|---|
   | `-f` | `1` or `2` | `wav` or `raw` |
   | `-b` | `1` to `5` | `16`, `24`, `32` or `32f` |
   | `-d` | always downmixes 5.1 to stereo | defaults to mono and accepts a layout |

   Check scripts that call `faad` before replacing the old package.
4. **Move reverse dependencies over.** Use your distro's reverse-dependency tools to list packages that depend on `libfaad.so.2` or `faad2`, and rebuild each against `faad3` as its upstream ports.
5. **Retire the shim** when no package depends on `libfaad.so.2` any more.

### For applications

- **Apps on the legacy API:** they keep working with the shim. Test anything that relies on ADIF, LATM, DRM or the MAIN, LTP, SSR, LD and error-resilient profiles, which FAAD3 does not support. The [shim README](https://github.com/FreewareAdvancedAudio/faad2) lists every difference.
- **New code:** link `libfaad3` directly, not the shim.
- **Porting:** follow the [API mapping](/docs/libfaad#porting-from-the-legacy-neaacdec-api). Programs written for FAAD2 often carry workarounds for [legacy behavior](/docs/libfaad#legacy-behavior-you-may-be-working-around) that libfaad3 no longer needs.
- **Checking a machine:** see [Which version did I get?](/docs/install#which-version-did-i-get).

### Building against both during the transition

Choose the backend in the build system, not by probing headers: the include and link library must be picked together.

```meson
faad = dependency('faad3', required: false)
if faad.found()
  add_project_arguments('-DHAVE_FAAD3=1', language: 'c')
else
  faad = dependency('faad2')   # legacy library or the compatibility shim
endif
```

With pkg-config, test `faad3` first and fall back to `faad2`. With CMake, FAAD3 is a component of the `faac` package: `find_package(faac CONFIG COMPONENTS faad3)` provides the target `faac::faad3`.

Keep the `#if` in one place. Put a few functions (open, decode, flush, close, error text) in a single backend file and let the rest of the program call only those:

```c
#if HAVE_FAAD3
#include <faad3.h>
/* faad_config_init(), faad_decoder_open(), faad_decode_frame(),
 * faad_decoder_flush(), faad_decoder_close(), faad_strerror() */
#else
#include <neaacdec.h>   /* NeAACDec* */
#endif
```

- Inside the FAAD3 branch, `FAAD_VERSION_MAJOR` can gate later additions.
- Hide behavior differences in the backend, not only names: FAAD3 writes PCM into your buffer, reports PCM on the first frame and applies no DRC unless asked. See the [API mapping](/docs/libfaad#porting-from-the-legacy-neaacdec-api).
- Delete the legacy branch once the oldest distro you support ships FAAD3.
