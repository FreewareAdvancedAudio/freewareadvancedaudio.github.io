---
title: Installation Guide — FAAC & FAAD
description: Complete installation guide for FAAC (AAC Encoder) and FAAD (AAC Decoder) across macOS Homebrew, Linux package managers, and building from source via Meson, CMake, or Autotools.
---

# Installation Guide

Install **FAAC** (Encoder) and **FAAD** (Decoder) via macOS Homebrew, Linux package managers, or build directly from source.

---

## Check the version before integrating {data-icon="circle-info"}

Package versions and availability vary by operating-system release and enabled repositories. Inspect the installed CLI help and headers: newer profiles, container features, and the documented FAAC API may require a newer source build. The decoder packages below provide released **FAAD2**, not the FAAD3 development engine.

## macOS (Homebrew) {data-icon="laptop"}

Install using Homebrew on macOS:

```bash
# Install FAAC AAC Encoder
brew install faac

# Install FAAD AAC Decoder
brew install faad2
```

---

## Linux Package Managers {data-icon="box-open"}

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

## Building from Source {data-icon="code"}

Source code repositories and official release archives:
- **FAAC Repository & Releases**: [github.com/FreewareAdvancedAudio/faac](https://github.com/FreewareAdvancedAudio/faac)
- **FAAD Repository & Releases**: [github.com/FreewareAdvancedAudio/faad2](https://github.com/FreewareAdvancedAudio/faad2)

### Building FAAC (Meson / Ninja)

```bash
git clone https://github.com/FreewareAdvancedAudio/faac.git
cd faac

meson setup build
ninja -C build
sudo ninja -C build install
```

### Building FAAD (CMake / Make)

```bash
git clone https://github.com/FreewareAdvancedAudio/faad2.git
cd faad2

mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)
sudo make install
```
