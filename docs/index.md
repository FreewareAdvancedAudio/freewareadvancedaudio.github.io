---
layout: home
title: "FAAC & FAAD: Dependency-Free AAC Encoder and Decoder in C"
titleTemplate: false
description: "FAAC is an LGPL AAC encoder, decoder, resampler and MP4 muxer in dependency-free C. Faster than FDK-AAC in published tests, and real time on ESP32. Try it in your browser."
hero:
  name: "Freeware Advanced Audio"
  text: "Fast, compact AAC encoding and decoding in C"
  tagline: "FAAC encoding and FAAD decoding for embedded devices, media applications, and listeners who want to hear the difference."
  image:
    alt: "Freeware Advanced Audio visualizer"
  actions:
    - theme: brand
      text: "Get Started"
      link: "/docs/install"
    - theme: alt
      text: "Try Your Own Music"
      link: "/playground"
    - theme: alt
      text: "Choose an Implementation"
      link: "/docs/comparison"
features:
  - icon: "<i class=\"fa-solid fa-bolt feature-icon feature-icon--cyan\" aria-hidden=\"true\"></i>"
    title: "Fast encoding"
    details: "Faster aggregate encoding than the compared FDK-AAC, Apple AAC, and FFmpeg AAC builds in published testing, and real time on the ESP32 and ESP32-S3."
    link: "/docs/aac-benchmark"
    linkText: "Compare encoding speed"
  - icon: "<i class=\"fa-solid fa-sliders feature-icon feature-icon--blue\" aria-hidden=\"true\"></i>"
    title: "Build only what you need"
    details: "Switch off HE-AAC, DAB, DRC, or extra channels at build time. On ESP32 the decoder builds from 29 KB and the encoder from 37 KB of flash."
    link: "/docs/esp32-aac#trim-the-build"
    linkText: "See build options"
  - icon: "<i class=\"fa-solid fa-headphones feature-icon feature-icon--violet\" aria-hidden=\"true\"></i>"
    title: "Competitive audio quality"
    details: "Leading aggregate objective quality scores in published testing. Fine-tuned across speech, music, and difficult passages."
    link: "/docs/aac-benchmark"
    linkText: "See quality results"
  - icon: "<i class=\"fa-solid fa-code feature-icon feature-icon--cyan\" aria-hidden=\"true\"></i>"
    title: "Open development"
    details: "One C codebase from microcontrollers to desktops, with CLI guides and C APIs. Check the license and release status of the library you plan to use."
    link: "/docs/install"
    linkText: "Choose your library"
---

<div class="home-technical-wrapper vp-doc">

## More audio. Less overhead. {data-icon="gauge-high"}

### Fast encoding and decoding

<BenchmarkShowcase view="speed" />

FAAC encodes 4.2× faster than FDK-AAC, and FAAD3 decodes 2.4× faster. FAAD3 also ties the top overall MOS.

**Benchmark snapshot · November 3, 2026 · MacBook Pro M1, 32 GB.** Encoder and decoder figures come from the same generated leaderboard. Results depend on the tested builds and hardware. See the [benchmark results and tested versions](/docs/aac-benchmark).

### Build only what you need {data-icon="sliders"}

Every feature is a build option: HE-AAC (SBR), HE-AAC v2 (PS), DAB frames, dynamic range control, and channel count. Switch off what you don't use and the flash cost drops with it. See [Trim the build](/docs/esp32-aac#trim-the-build) for every switch. In the default build, FAAC and FAAD3 together are under a third of the size of FDK-AAC ([whole-library comparison](/docs/aac-benchmark#aac-library-size-faac-and-faad3-vs-fdk-aac)).

<Esp32Showcase view="build" />

## Every AAC profile. Real time. On an ESP32. {data-icon="microchip"}

The same FAAC and FAAD libraries that lead on powerful machines also run in real time on the ESP32-S3 and the original ESP32. Even the original ESP32, without PSRAM, decodes AAC-LC and HE-AAC v1 in real time.

<Esp32Showcase view="home" />

[Read AAC on ESP32](/docs/esp32-aac) for the encoding, decoding, and hardware details.

## Hear FAAC with your own music {data-icon="headphones"}

Try FAAC with familiar tracks and choose the settings that work for you. The browser converter needs no installation or uploads.

[Drop your own music into the converter](/playground), choose a bitrate, and listen. For a closer comparison, the [listening guide](/docs/listening) walks through a controlled test. Your feedback helps us understand what works well and what still needs attention.

For measured quality results, see the [AAC benchmark results](/docs/aac-benchmark). Objective scores complement listening, and results depend on the tested builds and hardware.

## Choose your starting point {data-icon="compass"}

| What you want to do | Start here |
| :--- | :--- |
| Encode music, speech, or streaming audio | [Install FAAC](/docs/install), then try the [CLI and C API](/docs/faac) |
| Play or decode existing AAC files | [FAAD decoder guide](/docs/faad) and [libfaad API reference](/docs/libfaad) |
| Mux, demux, or tag MP4/M4A files | [FAAM guide](/docs/faam), [libfaam C API](/docs/libfaam), and [faam(1)](/docs/faam-cli) |
| Convert audio sample rates | [FAAR guide](/docs/faar), [libfaar C API](/docs/libfaar), and [faar(1)](/docs/faar-cli) |
| Choose an encoder or decoder for your application | [Implementation selection guide](/docs/comparison), including hardware, profiles, and licensing |
| Compare speed, quality, and build size | [AAC benchmark results](/docs/aac-benchmark) |
| Run AAC encoding or decoding on a microcontroller | [AAC on ESP32](/docs/esp32-aac) |
| Fit AAC in a flash budget | [Trim the build](/docs/esp32-aac#trim-the-build) |
| Hear FAAC with your own music | [Browser converter](/playground), with an optional [listening guide](/docs/listening) |

## Where FAAC and FAAD are used {data-icon="layer-group"}

From camera firmware to desktop audio tools, these projects integrate FAAC or FAAD:

| Project | Integration |
| :--- | :--- |
| [Thingino](https://github.com/themactep/thingino-firmware/blob/stable/package/faac/faac.mk) | Packages FAAC for open-source firmware for Ingenic IP cameras. |
| GStreamer | Provides [FAAC encoding](https://gstreamer.freedesktop.org/documentation/faac/index.html) and [FAAD2 decoding](https://gstreamer.freedesktop.org/documentation/faad/index.html) elements for multimedia pipelines. |
| [LightNVR](https://lightnvr.com/) | Bundles the [FAAC encoder](https://github.com/opensensor/lightNVR/blob/main/src/video/faac_encoder.c) to transcode camera audio to AAC in its open-source network video recorder. |
| [VLC Media Player](https://github.com/videolan/vlc/blob/master/modules/codec/faad.c) | Includes a FAAD2 decoder integration. |
| [fre:ac](https://github.com/enzo1982/freac/blob/master/Readme) | Uses FAAC and FAAD2 for AAC conversion in its audio converter and CD ripper. |

Available libraries and features depend on each project's version and build. Report reproducible library problems in [FAAC and FAAD issues](https://github.com/FreewareAdvancedAudio/faac/issues), including your library version and settings.

## Latest from the blog {data-icon="newspaper"}

<BlogList :limit="3" />

[All posts](/blog/)

## Quick questions {data-icon="circle-question"}

### How do I install the libraries and tools?

Use a package manager or build from source. The [installation guide](/docs/install) explains the options and why package versions matter.

### Which software license do FAAC and FAAD use?

The FAAC encoder, FAAD3, FAAM and FAAR are LGPL v2.1+. Legacy FAAD2, which many package managers still ship as `faad2`, is GPL v2+. [Which version did I get?](/docs/install#which-version-did-i-get)

### Do AAC patents affect my use?

Patent considerations depend on the AAC profile and jurisdiction. See [patent status by profile](/docs/comparison#patent-status-by-aac-profile).

### How can I help improve quality?

Share the exact encoder version, settings, source sample you have permission to distribute, and what you hear. Our [listening guide](/docs/listening) explains how to make a useful comparison and report.

</div>
