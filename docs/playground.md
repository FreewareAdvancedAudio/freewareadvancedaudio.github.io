---
title: Try FAAC — Browser Audio Converter
description: Encode audio to M4A locally in your browser with FAAC. Your files stay on your device.
---

# Try FAAC in Your Browser

Encode audio to **M4A** with FAAC, listen to the result, and download it. **Your audio stays on your device**; conversion does not upload your files.

<WasmConverter />

## Listen, compare, and explore {data-icon="headphones"}

Start with a lossless WAV or FLAC supported by your browser, then try different bitrates or AAC profiles. For a repeatable quality test, follow the [listening guide](/docs/listening) and use a local encoder build with recorded settings.

The demo supports **AAC-LC** and **HE-AAC v1 (SBR)**, with target average bitrates from **32 to 320 kbps**. It writes gapless playback metadata for players that support it.

## Browser support and playback {data-icon="circle-play"}

Input formats depend on your browser's audio decoder. Common inputs include WAV, MP3, FLAC, OGG, M4A, AAC, and WebM, but availability varies. Web Audio may resample the input to the browser's audio-context sample rate; results show the rate sent to the encoder. This demo converts decoded audio to 16-bit PCM before encoding.

Playback depends on the browser's AAC profile support. If the preview cannot play an HE-AAC file, download it and try a compatible player. Keep your original lossless files for archiving.

Browser performance depends on your device and browser. For integration and evaluation guidance, see [choosing an audio codec](/docs/comparison).
