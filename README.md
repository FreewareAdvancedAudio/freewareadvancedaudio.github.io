# Freeware Advanced Audio Organization (FAAC & FAAD2)

Official website and technical documentation platform for **FAAC** (LGPL v2.1+ AAC Encoder) and **FAAD2** (GPL v2+ AAC Decoder), built with VitePress.

---

## Highlights & Features

- **FAAC 2.2.0 (Encoder)**: Cleanroom LGPL v2.1+ C11/C99 rewrite free of ISO reference code. Supports AAC-LC and HE-AAC v1 with `-b` Average Bitrate (ABR) rate control.
- **FAAD2 2.11.1 (Decoder)**: Standalone GPL v2+ decoder for MPEG-2/4 AAC, HE-AAC v1/v2, and up to 7.1 surround audio streams.
- **Interactive Audio Playground**: Live in-browser audio encoding and decoding powered by C cross-compiled WebAssembly engines (Emscripten/Meson/CMake).
- **Technical Documentation & Benchmarks**: CLI usage guides, `libfaac` / `libfaad2` C API references, patent expiration timelines (AAC-LC, HE-AAC v1 & v2), and objective codec evaluations.
- **PagesCMS & Decap Integration**: Native `.pages.yml` configuration for content management and blog updates.

---

## Repository Structure

```
├── .github/workflows/deploy.yml # GitHub Actions workflow for Docker site build & GH Pages deployment
├── .pages.yml                   # PagesCMS schema configuration
├── Dockerfile                   # Multi-stage build compiling FAAC & FAAD2 C libraries to WASM + VitePress site
├── docker-compose.yml           # Docker Compose setup (platform: linux/amd64)
└── docs/                        # VitePress documentation root
    ├── .vitepress/              # VitePress configuration, theme, and components
    │   ├── components/          # AudioVisualizer.vue & WasmConverter.vue
    │   ├── theme/               # Dark theme customizations & custom CSS
    │   └── config.ts            # VitePress navigation, sidebar, and metadata
    ├── blog/                    # Announcement blog posts
    ├── docs/                    # Technical guides (faac.md, faad2.md, comparison.md, faq.md)
    ├── index.md                 # Homepage with ecosystem integrations & interactive converter
    └── playground.md            # Interactive converter playground
```

---

## Local Development

```bash
# Install Node dependencies
npm install

# Start VitePress local dev server
npm run docs:dev

# Build static production site
npm run docs:build
```

---

## Docker & WebAssembly Build

To cross-compile `libfaac` and `libfaad2` from source into WebAssembly modules and build the VitePress distribution inside Docker:

```bash
# Build production site image via Docker Compose
docker compose build

# Run local server container on port 8080
docker compose up
```

WebAssembly build artifacts (`docs/public/wasm/`) are compiled inside Docker and published automatically via GitHub Actions without committing generated binaries to Git.
