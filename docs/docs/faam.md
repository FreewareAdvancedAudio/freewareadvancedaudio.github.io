---
title: FAAM MP4 Muxer and Demuxer
description: Understand when to use FAAM for MP4, M4A, and M4B files, how gapless AAC metadata works, and where to find the CLI and C API references.
---

# FAAM MP4 Muxer and Demuxer

**FAAM (Freeware Advanced Audio Muxer)** works with MP4, M4A, and M4B files. It wraps AAC streams (and H.264 or H.265 video) in a container, inspects tracks, extracts audio without re-encoding, edits tags and cover art, and manages audiobook chapters. It does not encode or decode audio or video; pair it with [FAAC](/docs/faac) and [FAAD](/docs/faad). Both the library and the command-line tool are licensed under **LGPL v2.1 or later**.

## When to use FAAM

- You have an AAC stream and need a playable M4A or M4B file.
- AAC gapless metadata must be written so tracks join without gaps.
- Tags, cover art, track numbers, or chapters need editing.
- You want to inspect or extract tracks without transcoding.

FAAM remuxes existing streams. It cannot repair damaged audio or improve sound quality.

## Gapless playback

AAC encoding adds priming samples at the start and padding at the end. If the container does not record those values, players may insert a gap or trim the wrong samples. FAAM writes the encoder delay and padding into the file so compatible players can play tracks gaplessly. ADTS streams do not carry this information, which is why muxing ADTS into M4A with FAAM is useful. For HE-AAC, the container counts samples at the core (half) rate, so the values differ from the full output rate.

## Documentation

- [FAAM CLI manual](/docs/faam-cli) for commands, options, and examples.
- [libfaam C API](/docs/libfaam) for the supported content, build flags, and streaming API.
- [Installation guide](/docs/install) to build FAAM from source.
