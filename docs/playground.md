---
title: "Free Online AAC Encoder: WAV to M4A"
description: "Convert audio to AAC (M4A) in your browser with FAAC. Private, nothing is uploaded. Compare bitrates and profiles."
---

# Free Online AAC Encoder, Powered by FAAC

Convert WAV, FLAC or MP3 to M4A (AAC) with [FAAC](/docs/faac), the open-source encoder, listen to the result, and download it. Your files stay on your device and are never uploaded.

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

## Browser notes & privacy {data-icon="circle-play"}

- **Private & client-side:** Audio files are processed locally in your browser and never uploaded to any server. There are no fees, accounts, or upload limits.
- **Input formats:** Supported formats depend on your browser's decoder, including WAV, MP3, FLAC, OGG, M4A, AAC, and WebM.
- **Sample rate accuracy:** For WAV and FLAC, the page reads the sample rate from the file header (such as 44.1, 48, or 96 kHz) and decodes to 32-bit float, preserving full bit depth. Other formats may be resampled by the browser to its native output rate, so use WAV or FLAC when sample-rate fidelity matters.
- **Playback:** If your browser does not support in-page playback of HE-AAC streams, download the output M4A file and open it in an external media player.

Keep your original lossless files.

Looking to integrate AAC encoding into your own software? See the [installation guide](/docs/install) and [implementation comparison](/docs/comparison).
