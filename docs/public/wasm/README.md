# FAAC WebAssembly In-Browser Encoder Engine

This directory contains the WebAssembly compilation output and background Web Worker script for the in-browser interactive audio converter component (`<WasmConverter />`).

## Directory Contents

- `faac.js` / `faac.wasm`: Emscripten WebAssembly compilation output of `libfaac` and `mp4write`.
- `scripts/wasm-api.c` (compiled into the module): C converter module that owns encoder setup, buffers, MP4 configuration, gapless metadata, and finalization. JavaScript uses opaque sessions and scalar values instead of FAAC or MP4 structs.
- `faac-worker.js`: Dedicated Web Worker script that offloads frame-by-frame AAC audio encoding and MP4 container creation from the main browser UI thread.

## License & Copyright

- **WebAssembly Component & Worker Code (`faac-worker.js`)**: Licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.
- **FAAC Library (`libfaac`)**: Licensed under the **GNU Lesser General Public License v2.1+ (LGPL v2.1+)**.
- **Website & Documentation Content**: Licensed under the **Creative Commons Attribution-ShareAlike 4.0 International (CC-BY-SA 4.0)**.
