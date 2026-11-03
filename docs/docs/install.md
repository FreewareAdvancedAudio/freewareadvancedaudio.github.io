---
title: "Install FAAC and FAAD: Packages and Source"
description: "Install the FAAC encoder and FAAD decoder from packages or build FAAD3 from source. Check whether you got GPL FAAD2 or LGPL FAAD3."
---

# Installation Guide

Get **FAAC** for AAC encoding and **FAAD** for AAC decoding. Choose a platform below or build from source.

## Windows {data-icon="windows"}

Download the Windows release packages from the [releases page](https://github.com/FreewareAdvancedAudio/faac/releases).

## macOS (Homebrew) {data-icon="apple"}

Install using Homebrew on macOS:

```bash
# Install FAAC AAC Encoder
brew install faac

# Install the decoder package available in Homebrew (check its version)
brew install faad2
```

---

## Linux Package Managers {data-icon="linux"}

Where available in your configured repositories, install using your system package manager:

### Debian / Ubuntu
```bash
sudo apt update
sudo apt install faac faad
```

### Fedora / RHEL
```bash
sudo dnf install faac faad2
```

### Arch Linux
```bash
sudo pacman -S faac faad2
```

---

## Which version did I get? {data-icon="scale-balanced"}

Package managers mostly ship the older FAAD2 decoder, not the current FAAD3 library. This project no longer supports FAAD2; build FAAD3 from source for fixes and the LGPL license.

| Decoder | License | API | How to tell |
| :--- | :--- | :--- | :--- |
| FAAD2 (legacy, no longer supported; `faad2` packages) | GPL v2+ | `NeAACDec*` in `neaacdec.h` or `faad.h` | `pkg-config --modversion faad2` prints a version |
| FAAD3 (current, build from source) | LGPL v2.1+ | `faad_*` in `faad3.h` | `pkg-config --modversion faad3` prints a version |

FAAC 2.2 is the latest release; FAAD3, FAAM and FAAR are in development and available from source. For closed-source linking, use FAAC 2.0 or later and FAAD3. See [software licenses](/docs/comparison#software-licenses-and-patent-rights).

## Build the current libraries and tools from source {data-icon="code"}

For developers who need to build the current libraries and command-line tools, use the source repository. Some operating-system packages still provide the legacy FAAD2 decoder rather than the current FAAD API; see [software licenses](/docs/comparison#software-licenses-and-patent-rights) for details.

Current combined source for FAAC, FAAD, FAAM and FAAR:
- **FAAC, FAAD, FAAM and FAAR Source**: [github.com/FreewareAdvancedAudio/faac](https://github.com/FreewareAdvancedAudio/faac)

### Building the libraries and tools (Meson / Ninja)

```bash
git clone https://github.com/FreewareAdvancedAudio/faac.git
cd faac

meson setup build -Dencoder=true -Ddecoder=true
meson compile -C build
sudo meson install -C build
```

Use `-Dencoder=false` or `-Ddecoder=false` to leave out the encoder or decoder. `libfaam` and `libfaar` are always built; `-Dfrontend=false` omits the command-line tools.

### Documentation

| Library or tool | Guide | CLI manual |
| :--- | :--- | :--- |
| FAAC AAC encoder | [FAAC guide](/docs/faac), [libfaac C API](/docs/libfaac) | [faac(1)](/docs/faac-cli) |
| FAAD AAC decoder | [FAAD guide](/docs/faad), [libfaad C API](/docs/libfaad) | [faad(1)](/docs/faad-cli) |
| FAAM MP4 muxer/demuxer | [FAAM guide](/docs/faam), [libfaam C API](/docs/libfaam) | [faam(1)](/docs/faam-cli) |
| FAAR sample rate converter | [FAAR guide](/docs/faar), [libfaar C API](/docs/libfaar) | [faar(1)](/docs/faar-cli) |
