---
title: "Free Online AAC to M4A Converter"
description: "Convert audio to AAC (M4A) in your browser with FAAC compiled to WebAssembly. Your files never leave your device; compare bitrates and profiles."
---

# Try FAAC in Your Browser

Encode audio to **M4A** with FAAC, listen to the result, and download it. **Your audio stays on your device**; conversion does not upload your files.

<WasmConverter />

## Listen, compare, and explore {data-icon="headphones"}

No audio handy? Use **Try a demo song** to load a full-length track and start comparing settings right away. Otherwise start with a lossless WAV or FLAC supported by your browser, then try different bitrates or AAC profiles. For a repeatable quality test, follow the [listening guide](/docs/listening) and use a local encoder build with recorded settings.

The demo supports **AAC-LC** and **HE-AAC v1 (SBR)** with **VBR quality**, **ABR average bitrate**, and **CBR constant bitrate** controls. Audio is decoded when selected and reused for each encode. Results show the resolved profile, rate mode and setting, source format, duration, output size, and approximate average bitrate. The average includes M4A container overhead, so it may differ slightly from the selected AAC bitrate. M4A output includes gapless playback metadata.

## Browser support and playback {data-icon="circle-play"}

Input formats depend on your browser's audio decoder. Common inputs include WAV, MP3, FLAC, OGG, M4A, AAC, and WebM, but availability varies. For WAV and FLAC, the page reads the sample rate from the file header (e.g. 44.1, 48 or 96 kHz) and asks the browser to decode at that rate; the browser decodes to 32-bit float, so 16- and 24-bit sources are held exactly. For other formats the browser may resample to its own output rate, so use WAV or FLAC when sample-rate fidelity matters.

Playback depends on the browser's AAC profile support. If the preview cannot play an HE-AAC file, download it and try a compatible player. Keep your original lossless files for archiving.

Browser performance depends on your device and browser. For integration and evaluation guidance, see [choosing an audio codec](/docs/comparison).
