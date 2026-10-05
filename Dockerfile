# Multi-stage Dockerfile for Freeware Advanced Audio build & web server
FROM emscripten/emsdk:3.1.6 AS builder

WORKDIR /build

# Install build dependencies and modern Meson via pip
RUN apt-get update && apt-get install -y --no-install-recommends \
    git ninja-build cmake nodejs npm python3-pip python3-setuptools \
    && pip3 install --no-cache-dir meson \
    && rm -rf /var/lib/apt/lists/*

# Copy FAAC git submodule repository
COPY vendor/faac /build/faac_src

# Create Meson cross file for Emscripten FAAC build with cpu_family
RUN echo "[binaries]" > /build/emscripten.cross && \
    echo "c = 'emcc'" >> /build/emscripten.cross && \
    echo "cpp = 'em++'" >> /build/emscripten.cross && \
    echo "ar = 'emar'" >> /build/emscripten.cross && \
    echo "strip = 'emstrip'" >> /build/emscripten.cross && \
    echo "[host_machine]" >> /build/emscripten.cross && \
    echo "system = 'emscripten'" >> /build/emscripten.cross && \
    echo "cpu_family = 'wasm32'" >> /build/emscripten.cross && \
    echo "cpu = 'wasm32'" >> /build/emscripten.cross && \
    echo "endian = 'little'" >> /build/emscripten.cross

# Build libfaac WASM
RUN cd /build/faac_src && \
    meson setup build_wasm --cross-file /build/emscripten.cross -Ddefault_library=static && \
    ninja -C build_wasm

COPY scripts/wasm-api.c /build/wasm-api.c

# Compile Emscripten JS/WASM FAAC output module
RUN mkdir -p /build/out_wasm && \
    emcc -O2 /build/wasm-api.c /build/faac_src/build_wasm/libfaac/libfaac.a /build/faac_src/build_wasm/frontend/libfrontend.a \
      -I/build/faac_src/include -I/build/faac_src/frontend \
      -s EXPORTED_FUNCTIONS='["_wasm_converter_open","_wasm_converter_object_type","_wasm_converter_frame_samples","_wasm_converter_rate_control","_wasm_converter_bit_rate","_wasm_converter_quant_quality","_wasm_converter_input","_wasm_converter_encode","_wasm_converter_finish","_wasm_converter_close","_wasm_converter_error","_wasm_converter_version","_malloc","_free"]' \
      -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","getValue","setValue","FS","UTF8ToString","stringToUTF8","addFunction","removeFunction"]' \
      -s ALLOW_MEMORY_GROWTH=1 \
      -s ALLOW_TABLE_GROWTH=1 \
      -s FORCE_FILESYSTEM=1 \
      -s MODULARIZE=1 -s EXPORT_NAME="FAACModule" \
      -o /build/out_wasm/faac.js

# Development stage
FROM node:20-slim AS app

WORKDIR /app

# Copy package definition and install dependencies
COPY package*.json ./
RUN npm ci || npm install

# Copy application source
COPY . .

# Copy compiled WASM assets from builder stage
COPY --from=builder /build/out_wasm/ /app/docs/public/wasm/
# Keep a copy outside the bind-mounted source tree so Docker Compose development
# can restore the generated assets when the repository mount hides docs/public.
COPY --from=builder /build/out_wasm/ /opt/faac-wasm/

EXPOSE 5173 4173

CMD ["sh", "-lc", "cp /opt/faac-wasm/* docs/public/wasm/ && npm run docs:dev -- --host 0.0.0.0"]

# Static site builder stage for production deployment
FROM app AS site-builder

ARG SITE_BASE_PATH=/
ARG SITE_ORIGIN=https://freewareadvancedaudio.github.io
ENV SITE_BASE_PATH=$SITE_BASE_PATH SITE_ORIGIN=$SITE_ORIGIN

RUN node scripts/test-wasm-converter.cjs docs/public/wasm && npm run docs:build
