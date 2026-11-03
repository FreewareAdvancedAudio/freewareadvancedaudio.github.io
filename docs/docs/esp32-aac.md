---
title: "AAC on ESP32: Encoder and Decoder Guide"
description: "Run FAAC encoding and FAAD decoding in real time on ESP32 and ESP32-S3. See which chip handles HE-AAC v2 and 5.1, RAM costs, PSRAM needs and build sizes."
pageClass: esp32-aac-page
---

# AAC on ESP32

Two things decide what an ESP32 project can do with AAC: whether the chip has an **FPU**, and how much **internal RAM** the codec state needs. PSRAM is how you get past the second limit. A third lever is the build: every FAAC and FAAD feature is optional, so an AAC-LC-only decoder is 28.8 KB of flash and the encoder starts at 37.4 KB. See [Trim the build](#trim-the-build).

- **ESP32-S3 with PSRAM** is the board to pick. It runs every path tested here: decode through HE-AAC v2, encode through HE-AAC v2, and 5.1 encode.
- **Classic ESP32 without PSRAM** decodes AAC-LC and HE-AAC v1 and encodes AAC-LC and HE-AAC v1, though a stereo HE-AAC v1 encoder leaves only about 115 KB of its internal RAM for everything else. HE-AAC v2 encode does not open, and an HE-AAC v2 stream plays as its mono half-rate core.
- **No FPU (ESP32-C6, ESP8266):** decode with Helix. FAAC encoding on the C6 is far below real time except for mono voice.

## Choose your board

| Board | FPU | Plays in real time | Records in real time | What limits it |
| :--- | :--- | :--- | :--- | :--- |
| ESP32-S3 (240 MHz) | Yes | AAC-LC, HE-AAC v1, HE-AAC v2 | AAC-LC, HE-AAC v1, HE-AAC v2, and 5.1 with PSRAM | 5.1 needs PSRAM |
| Classic ESP32 (240 MHz) | Yes | AAC-LC, HE-AAC v1 | AAC-LC, HE-AAC v1 | RAM: HE-AAC v2 encode does not open, and HE-AAC v2 decode falls back to the mono core |
| ESP32-C6 (160 MHz) | No | AAC-LC, HE-AAC v1 (Helix) | Mono voice at 24 kHz and below | No FPU: FAAC runs at a fraction of real time on stereo |
| ESP8266 (80/160 MHz) | No | AAC-LC (Helix) | None tested | No SBR, so no HE-AAC |

PSRAM depends on the module, not the chip: check your board's datasheet. HE-AAC v2 encode runs at about 2× real time on the ESP32-S3 for 48 kHz stereo, which is one scenario and a rough indication, not a general figure.

<Esp32Showcase view="devices" />

<Esp32Showcase view="memory" />

## What each feature costs in RAM

The state is allocated when you open the codec. It is the same at every bitrate and sample rate.

| Feature | Library | FPU | State in internal RAM |
| :--- | :--- | :--- | :--- |
| Decode AAC-LC | [FAAD](/docs/faad) | Yes | 49 KB |
| Decode HE-AAC v1 | [FAAD](/docs/faad) | Yes | 98 KB |
| Decode HE-AAC v2 (stereo) | [FAAD](/docs/faad) | Yes | 120 KB |
| Decode, no FPU | Helix | No | about 79 KB |
| Encode AAC-LC | [FAAC](/docs/faac) | Yes | mono 49 KB, stereo 90 KB |
| Encode HE-AAC v1 | [FAAC](/docs/faac) | Yes | mono 83 KB, stereo 142 KB |
| Encode HE-AAC v2 (stereo only) | [FAAC](/docs/faac) | Yes | 184 KB |
| Encode 5.1 (6 channels) | [FAAC](/docs/faac) | Yes | about 250 KB |

- **Stack:** an encoder task used about 9 KB for AAC-LC and 9.5 KB for HE-AAC, so budget 10–14 KB. A decoder task used about 2 KB for AAC-LC and 8 KB for HE-AAC.
- **Flash and static RAM:** with default options FAAD takes about 77 KB of flash and 69 KB of static RAM, and FAAC about 47 KB of flash (57 KB with the HE-AAC v2 encoder) and 22 KB of static RAM. Most of FAAD's footprint is optional; see [Trim the build](#trim-the-build).
- **HE-AAC v2 support costs RAM for every HE stream.** With `-Dencoder-ps=true`, HE-AAC v1 state grows from 142 KB to 184 KB for stereo and from 83 KB to 126 KB for mono, even if you never encode v2.
- **More channels cost nothing on stereo streams.** A 6-channel encoder build uses the same state for a stereo stream as a 2-channel build.

## When you need PSRAM

Compare the state size above with the internal RAM that is free in your own app, after Wi-Fi, Bluetooth and your tasks have started: `heap_caps_get_free_size(MALLOC_CAP_INTERNAL)`. If the state is close to that number, or the open call returns an out-of-memory error, move the state to PSRAM.

For reference, a bare ESP32-S3 (minimal firmware, Wi-Fi and Bluetooth not started) has about 245 KB free and a bare classic ESP32 about 257 KB. Free RAM is split into regions: on the classic ESP32 the 142 KB stereo HE-AAC v1 encoder opened and ran, but the 184 KB build with HE-AAC v2 support did not open, although 257 KB was free.

In practice:

- **5.1 encode always needs PSRAM** on the S3: its state is about 250 KB, more than the 245 KB free.
- **Stereo HE-AAC v2 encode** (184 KB) fits a bare S3 but leaves little for anything else. It does not open on a bare classic ESP32.
- **Stereo HE-AAC v1 encode** (142 KB) ran on a bare classic ESP32, which leaves about 115 KB for your PCM buffers and everything else.
- **HE-AAC v2 decode** (120 KB) ran from internal RAM on the S3. On the classic ESP32 it did not: the decoder fell back to the mono half-rate core, so check the channel count and sample rate it reports.
- **AAC-LC decode and encode** ran from internal RAM on every board tested.

Not tested: an ESP32-S3 without PSRAM, and a classic ESP32 with PSRAM-backed state.

## If it doesn't fit

When opening the codec returns an out-of-memory error, work down this list:

1. **Encode mono, or AAC-LC.** State falls from 142 KB to 83 KB for HE-AAC v1 mono, or to 90 KB and 49 KB for AAC-LC.
2. **Leave HE-AAC v2 out of the encoder build** unless you encode v2. It adds 42 KB to every HE stream.
3. **Trim the decoder** ([below](#trim-the-build)). That saves static RAM, not the state above.
4. **Put the state in PSRAM.** Both libraries let you override `AllocMemory` and `FreeMemory` at build time. For the decoder, this took HE-AAC v2 decode to 16 KB of internal RAM for 13% less speed, measured on an earlier build. For 5.1 encode, setting `CONFIG_SPIRAM_USE_MALLOC` with a small always-internal threshold left about 100 KB internal. Be aware that this moves every large `malloc` in your app.
5. **Choose a board with more RAM.**

## Trim the build

The default build enables SBR, HE-AAC v2 decoding, DAB and DRC, most projects need only some of these. Encoder HE-AAC v2 is off by default and needs `-Dencoder-ps=true`. Pick the smallest build that covers what you need. Figures are libfaad and libfaac on an ESP32-S3, built for two channels, and decoded audio was identical for every stream a build still supports.

**What a build changes:** options cut flash for both libraries, and some decoder options also cut static RAM. The encoder's static RAM stays at 22 KB, and what you encode decides its codec state. This table pairs each profile's flash with the codec state it needs at run time (stereo).

| You need | Decoder flash | Decoder state | Encoder flash | Encoder state |
| :--- | ---: | ---: | ---: | ---: |
| AAC-LC | 28.8 KB | 49 KB | 37.4 KB | 90 KB |
| AAC-LC + HE-AAC v1 | 57.2 KB | 98 KB | 47.4 KB | 142 KB |
| AAC-LC + HE-AAC v1 + v2 | 76.7 KB | 120 KB | 57.4 KB | 184 KB |

### Playing AAC (FAAD)

| I need to play | Build | Flash | Static RAM |
| :--- | :--- | :--- | :--- |
| Everything, including HE-AAC v2 | Defaults | 76.7 KB | 68.7 KB |
| AAC-LC and HE-AAC v1 | `-Ddecoder-ps=false -Ddecoder-dab=false -Ddecoder-drc=false` | 57.2 KB | 38.6 KB |
| AAC-LC only | The same, plus `-Ddecoder-sbr=false` | 28.8 KB | 34.5 KB |

Each switch on its own, against the defaults:

| Option | Removes | Flash | Static RAM |
| :--- | :--- | :--- | :--- |
| `-Ddecoder-dab=false` | DAB 960/120-sample frames; ordinary 1024-sample AAC is unaffected | −4.7 KB | −13.2 KB |
| `-Ddecoder-drc=false` | Dynamic range control | −2.9 KB | none |
| `-Ddecoder-ps=false` | HE-AAC v2 decode; those streams play as mono | −11.8 KB | −16.9 KB |
| `-Ddecoder-sbr=false` | All HE-AAC (also removes PS); HE streams then play as the half-rate core | −40.5 KB | −21.0 KB |

### Recording AAC (FAAC)

| I need to record | Build | Flash | Static RAM | Encoder state |
| :--- | :--- | :--- | :--- | :--- |
| AAC-LC (voice or music) | `-Dencoder-sbr=false` | 37.4 KB | 22.0 KB | mono 49 KB, stereo 90 KB |
| Low-bitrate HE-AAC v1 | Defaults | 47.4 KB | 22.0 KB | mono 83 KB, stereo 142 KB |
| Low-bitrate stereo HE-AAC v2 | `-Dencoder-ps=true` | 57.4 KB | 22.0 KB | stereo 184 KB |
| 5.1 surround | `-Dmax-channels=6` as well | +0.7 KB | unchanged | about 250 KB |

**Build options mostly save flash, not RAM.** The encoder's static RAM is 22 KB in every build, and the AAC-LC state is the same with or without HE-AAC compiled in. The exception is `encoder-ps`, which adds 42 KB of state to every HE-AAC stream, so leave it off unless you encode v2. Otherwise, what you encode decides RAM use: mono against stereo, and AAC-LC against HE-AAC.

## Start building

1. **Build for ESP-IDF** with the FAAC and FAAD sources and the [installation guide](/docs/install).
2. **Pick build options** from the table in [Trim the build](#trim-the-build) that matches your goal.
3. **Feed frames or PCM.** FAAD consumes AAC frames; FAAC consumes PCM. See the [libfaad API](/docs/libfaad) and [libfaac API](/docs/libfaac).

**ESP8266:** not ESP-IDF. Use the Helix port in [ESP8266Audio](https://github.com/earlephilhower/ESP8266Audio).

## Known limits

- Memory figures are heap taken by the codec on a minimal firmware. Wi-Fi, Bluetooth and your own tasks draw from the same pool and were not measured.
- Stereo HE-AAC v1 encode on the classic ESP32 was tested with a PCM buffer under 0.1 s, so its speed (at least 2.8× real time) is a lower bound.
- 5.1 was tested as encode only. The 5.1 test input was synthesized from a stereo clip, so it is valid for memory but not for speed. 5.1 decode and an 8-channel decoder build were not measured.
- Speed and bitrate accuracy were measured, not listening quality.
- The Helix state figure and the 13% PSRAM speed cost come from an earlier benchmark.

## Common questions

### Can an ESP32 encode AAC?

Yes: AAC-LC and HE-AAC v1 on every chip with an FPU, and stereo HE-AAC v2 on the ESP32-S3. See [Choose your board](#choose-your-board).

### What is the difference between AAC-LC, HE-AAC v1, and HE-AAC v2?

LC is the baseline; v1 adds SBR for low bitrates; v2 adds PS for low-bitrate stereo.

### Does FAAC encode HE-AAC v2 on ESP32?

Yes, on the ESP32-S3 at about 2× real time for 48 kHz stereo, if you build with `encoder-ps`; the classic ESP32 cannot open it. See [What each feature costs in RAM](#what-each-feature-costs-in-ram).

### Do I need PSRAM?

Not for AAC-LC or HE-AAC v1, encoding or decoding, on the boards tested. For 5.1 encode, yes; for HE-AAC v2 encode and decode it depends on the board and on how much internal RAM your app has left. See [When you need PSRAM](#when-you-need-psram).

### Can I use AAC on an ESP8266?

AAC-LC decode with Helix. No HE-AAC (no SBR) and no tested encoder.

### Does FAAD support multichannel on ESP32?

Not measured. The decoder tests covered stereo.

## Benchmark notes

The RAM, footprint, HE-AAC v2 and 5.1 figures on this page come from on-device runs of FAAC and FAAD at 3.0.0 (`daf64763`) on ESP-IDF v5.5.5, using an ESP32-S3 (8 MB PSRAM), an ESP32-C6 and a classic ESP32 without PSRAM. Speed ranges for AAC-LC and HE-AAC v1 come from the [full ESP32 AAC benchmark notes](https://gist.github.com/nschimme/cfa0a3d225c8c001eb7d998739b7298a), which cover earlier builds, scenarios, and exact numbers.
