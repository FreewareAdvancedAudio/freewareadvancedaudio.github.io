# FAAC & FAAD

Website and documentation for **FAAC**, an LGPL-licensed, dependency-free AAC encoder and decoder suite with a resampler and MP4 muxer, built with VitePress. It targets high-throughput media pipelines and microcontrollers such as the ESP32, and is configurable at build time so each project ships only the features it needs.

---

## Highlights & Features

- **FAAC (Encoder)**: Cleanroom LGPL v2.1+ C11/C99 rewrite free of ISO reference code. Supports AAC-LC and HE-AAC v1 with VBR, ABR and CBR rate control.
- **FAAD (Decoder)**: C11 decoder for AAC-LC and HE-AAC v1/v2, with optional multichannel support. Licensed under LGPL v2.1+.
- **FAAM (Muxer/Demuxer)**: C11 MP4/M4A/M4B muxer, demuxer, and tag editor for AAC audio and H.264/H.265 video. Licensed under LGPL v2.1+.
- **FAAR (Resampler)**: C11 sample rate converter for interleaved float PCM, with Fast, Good, and High quality profiles. Licensed under LGPL v2.1+.
- **Interactive Audio Playground**: Live in-browser FAAC encoding powered by a C library cross-compiled to WebAssembly; input decoding uses browser audio support. An opt-in demo song (from the `faac-media` submodule) is available.
- **ESP32 & Benchmarks**: A guide to AAC on ESP32 and a published speed, quality and build-size benchmark against other AAC implementations.
- **Technical Documentation & Listening**: Codec selection guidance, install and optimization guides, CLI manuals for `faac`, `faad`, `faam` and `faar`, C API references for all four libraries, and controlled listening guidance.
- **PagesCMS Integration**: Native `.pages.yml` configuration for content management and blog updates.

---

## Repository Structure

```
├── .github/                     # deploy.yml (Docker site build & GH Pages deployment), dependabot.yml
├── .dockerignore                # Docker build context exclusions
├── .gitignore                   # Ignore rules for build output, WASM binaries & generated reference docs
├── .gitmodules                  # Submodules: vendor/faac (source) and vendor/faac-media (demo audio)
├── .pages.yml                   # PagesCMS schema configuration
├── Dockerfile                   # Multi-stage build compiling FAAC to WASM + VitePress site
├── docker-compose.yml           # Docker Compose setup (dev 5173, preview 4173)
├── LICENSE
├── scripts/                     # generate-cli-docs.js, dev-docs.js, test-wasm-converter.cjs, wasm-api.c
├── vendor/
│   ├── faac/                    # FAAC, FAAD, FAAM and FAAR source, libraries, CLI tools, and manuals
│   └── faac-media/              # Demo audio used by the playground
└── docs/                        # VitePress documentation root
    ├── .vitepress/              # VitePress configuration, theme, and components
    │   ├── components/          # AudioVisualizer, BenchmarkShowcase, Esp32Showcase, WasmConverter (.vue)
    │   ├── theme/               # Dark theme customizations & custom CSS
    │   └── config.ts            # VitePress navigation, sidebar, and metadata
    ├── blog/                    # Announcement blog posts
    ├── docs/                    # Product pages, generated API references, CLI manuals, install/optimization,
    │                            #   ESP32 guide, benchmark, comparison and listening guides
    ├── public/                  # Static assets (logo, og image, WASM worker; WASM binaries are build output)
    ├── index.md                 # Homepage with niche highlights & quick Q&A
    └── playground.md            # Interactive converter playground
```

---

## Recommended Local Development (Docker)

To compile the FAAC encoder into WebAssembly using Emscripten and run the full VitePress site locally:

```bash
# Clone repository with submodules
git clone --recursive https://github.com/FreewareAdvancedAudio/freewareadvancedaudio.github.io.git
cd freewareadvancedaudio.github.io

# Build WASM modules and start local development server in Docker
docker compose up --build
```

Access the development server at `http://localhost:5173`. The production preview is on port `4173`.

---

## Node-Only Development (Docs & Content Editing)

If you are only editing documentation, blog posts, or site layout without modifying C code or compiling WebAssembly:

```bash
# Update submodules if needed
git submodule update --init --recursive

# Install Node dependencies
npm install

# Start VitePress with live reload (also regenerates references when vendor docs change)
npm run docs:dev

# Build static production site
npm run docs:build
```

*Note: WebAssembly build artifacts (`docs/public/wasm/`) are compiled inside Docker and published automatically via GitHub Actions without committing generated binaries to Git.*

## Deploying at a subpath or on a fork

VitePress needs the deployment base path at build time. GitHub Actions reads the site's configured Pages URL with `actions/configure-pages` and passes its base path and origin into the Docker build. This supports both a domain-root site and a project site such as `https://nils.schimmelmann.us/freewareadvancedaudio.github.io/`.

For another host, or to override the Pages settings, set the repository Actions variables `SITE_BASE_PATH` (for example `/freewareadvancedaudio.github.io/`) and `SITE_ORIGIN` (for example `https://nils.schimmelmann.us`). Use `/` for a domain-root deployment. Pull-request builds default to the root path unless overridden.

For local builds:

```bash
SITE_BASE_PATH=/freewareadvancedaudio.github.io/ SITE_ORIGIN=https://nils.schimmelmann.us npm run docs:build
npm run docs:preview
```

For Docker builds, pass the same values with `--build-arg SITE_BASE_PATH=...` and `--build-arg SITE_ORIGIN=...`. CSS, navigation, favicon, and the converter's worker/module URLs follow the configured base. Changing the host's mount path requires a rebuild.

The [AAC benchmark](docs/docs/aac-benchmark.md) is a dated snapshot generated by the FAAC project's own [benchmark suite](https://github.com/nschimme/faac-benchmark); it lives at `/docs/aac-benchmark`. Re-run and update it when results change. Evaluate codecs with audio you own or have permission to use.

The Docker production build smoke-tests the real WASM worker with generated tones in AAC-LC and HE-AAC v1, checks M4A/gapless output, and verifies error handling. To run that check against existing WASM artifacts: `node scripts/test-wasm-converter.cjs docs/public/wasm`. Pass a native FAAC CLI path as a second argument to compare MP4 timing, frame durations, and gapless fields against the frontend. HE-AAC follows the frontend's half-rate container domain, including rounding odd input sample counts.
