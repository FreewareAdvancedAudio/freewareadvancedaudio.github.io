---
title: "Free Online AAC to M4A Converter"
description: "Convert audio to AAC (M4A) in your browser with FAAC compiled to WebAssembly. Your files never leave your device; compare bitrates and profiles."
---

# Try FAAC in Your Browser

Convert audio to M4A (AAC), listen to the result, and download it. Your files stay on your device and are never uploaded.

<WasmConverter />

## How to use it {data-icon="headphones"}

1. Drop in an audio file, or pick **Try a demo song** to load a full-length track.
2. Choose a bitrate. The default is a good starting point; lower it for smaller files.
3. Press **Convert to M4A**, play the result next to the original, and download it.

You can change settings and convert again without decoding the file a second time. The average bitrate includes M4A container overhead, so it can differ slightly from the bitrate you selected.

For a repeatable quality test, follow the [listening guide](/docs/listening) and use a local encoder build with recorded settings.

## Settings {data-icon="sliders"}

Open **More settings** for these. The defaults suit most files.

- **Rate control:** *ABR* aims for an average bitrate. *CBR* holds the bitrate constant. *VBR* sets a quality level and lets the size vary.
- **AAC profile:** *Auto* picks for you. *AAC-LC* plays everywhere. *HE-AAC v1* targets low bitrates but isn't supported by every player.
- **Sample rate:** *Auto* lowers sources above 48 kHz to 48 or 44.1 kHz with ABR or CBR, except with HE-AAC v1. With AAC-LC at low bitrates it also drops 44.1 and 48 kHz sources to 32 kHz. *Keep* uses the input's rate. *Custom* picks a lower rate.

## What the output keeps {data-icon="tags"}

- Gapless playback information, so tracks join without a gap.
- Title, artist, album, track number and cover art, when the source is an M4A file. Other formats don't carry tags in.
- A tag naming the FAAC version and the settings used.

## Browser notes {data-icon="circle-play"}

- Which input formats work depends on your browser's decoder. WAV, MP3, FLAC, OGG, M4A, AAC and WebM are common, but availability varies.
- For WAV and FLAC, the page reads the sample rate from the file header (for example 44.1, 48 or 96 kHz) and asks the browser to decode at that rate. The browser decodes to 32-bit float, so 16- and 24-bit sources are held exactly.
- For other formats the browser may resample to its own output rate, so use WAV or FLAC when sample-rate fidelity matters.
- If the preview won't play an HE-AAC file, download it and open it in another player.
- Speed depends on your device and browser.

Keep your original lossless files.

Looking for a codec to integrate? See [choosing an audio codec](/docs/comparison).
