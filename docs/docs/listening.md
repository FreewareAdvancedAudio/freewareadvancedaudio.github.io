---
title: FAAC Listening Tests — Compare AAC Audio Quality
description: Test FAAC with your own music. Match AAC profiles and bitrates, run blind listening comparisons, and report reproducible audio quality issues.
---

# FAAC Listening Tests: Compare Audio Quality

Find the **AAC settings that sound right with your music**. Start with a quick browser conversion, then use a controlled listening test when you need a reliable comparison.

Looking for implementation support or speed measurements? Use the [selection guide](/docs/comparison) or [benchmark results](/docs/optimization).

## Try your own music {data-icon="headphones"}

The [browser converter](/playground) lets you encode a file locally and download an M4A. Start with a lossless source such as WAV or FLAC supported by your browser. Reencoding an MP3 or another lossy file adds a second generation of loss and complicates the comparison.

The demo is useful for exploration. For a reproducible comparison, use a local CLI build whose version and settings you can record. The browser demo uses its own compiled encoder and browser audio processing; a local build gives you more control over the test.

## Make a controlled comparison {data-icon="sliders"}

1. **Keep the source fixed.** Use the same lossless passage for each encoder. Include attacks, cymbals, sustained tones, vocals, and stereo material you find challenging.
2. **Match the settings.** Record sample rate, channels, AAC profile, rate-control mode, target bitrate, and actual output bitrate. Compare AAC-LC with AAC-LC and HE-AAC v1 with HE-AAC v1.
3. **Decode consistently.** Use the same decoder to create PCM files, align them with the source, and check for level differences. Avoid playback effects or normalization that changes only one candidate.
4. **Listen without knowing the identity.** Use an ABX tool to compare the reference with an encoded version. To compare preference between encoders, use a blind randomized comparison with the reference available. Record trial counts and results, not just a sighted impression.
5. **Retain the evidence.** Save commands, encoder and decoder versions, source details, and the specific time range where an artifact occurs.

AAC is lossy. Keep a lossless master for archiving, even if an AAC copy sounds transparent to you.

## Report a quality issue {data-icon="comment-dots"}

Share reproducible quality findings in [FAAC issues](https://github.com/FreewareAdvancedAudio/faac/issues).

Include:

- Encoder version or commit, build options, and operating system.
- Exact command, profile, sample rate, channels, and measured bitrate.
- Decoder version and listening-test method, including trial results when available.
- A short source sample you have permission to share, or instructions for reproducing it.
- The affected time range and what you hear, such as pre-echo, tonal noise, or a changed stereo image.

Specific findings help improve the encoder. Reports from experienced listeners, including people disappointed by older FAAC versions, are welcome.
