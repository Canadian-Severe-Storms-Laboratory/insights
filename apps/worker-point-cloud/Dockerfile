FROM oven/bun:1.3.11 AS base
WORKDIR /app

RUN apt-get update && apt-get install -y curl

# Install dependencies to run PotreeConverter
RUN apt-get install -y \
    libtbb-dev

# --- 1. Prepare Stage (Pruning) ---
FROM base AS prepare
RUN bun add -g turbo@^2
COPY . .
RUN turbo prune --docker @insights/worker-point-cloud


# --- 2. Builder Stage (C++ & Bun Install + Build) ---
FROM base AS builder

# Install dependencies for Ubuntu
RUN apt-get install -y \
    libtiff-dev libgeotiff-dev libgdal-dev \
    libboost-system-dev libboost-thread-dev libboost-filesystem-dev libboost-program-options-dev libboost-regex-dev libboost-iostreams-dev \
    git cmake build-essential wget

WORKDIR /temp/opt

# Install LAStools
RUN git clone https://github.com/m-schuetz/LAStools.git && cd LAStools/LASzip && mkdir build && cd build && \
    cmake -DCMAKE_BUILD_TYPE=Release .. && make && make install && ldconfig

# install PotreeConverter
RUN git clone -b develop https://github.com/potree/PotreeConverter.git && cd PotreeConverter && mkdir build && cd build && \
    cmake -DCMAKE_BUILD_TYPE=Release -DLASZIP_INCLUDE_DIRS=/temp/opt/LAStools/LASzip/dll/ -DLASZIP_LIBRARY=/usr/local/lib/liblaszip.so .. && \
    make && cp -r /temp/opt/PotreeConverter/resources /temp/opt/PotreeConverter/build/resources

WORKDIR /app
COPY --from=prepare /app/out/json/ .

# Install dependencies (creates the global cache, devDependencies, & workspace symlinks)
RUN bun install --frozen-lockfile

# Copy the actual source code over into the SAME stage
COPY --from=prepare /app/out/full/ .
COPY .oxlintrc.json .
COPY tsconfig.* .

# Run the build while the Bun cache and all workspace node_modules are intact
RUN bun run build


# --- 3. Release Stage ---
FROM base AS release
WORKDIR /app

# Copy PotreeConverter and built worker-point-cloud files
COPY --from=builder --chown=bun:bun /temp/opt/PotreeConverter/build /potree
COPY --from=builder /usr/local/lib/liblaszip.so /usr/local/lib/
COPY --from=builder --chown=bun:bun /app/apps/worker-point-cloud/dist ./dist

USER bun
ENV NODE_ENV=production \
    BASE_UPLOAD_DIR=/uploads \
    LD_LIBRARY_PATH=/usr/local/lib:/potree \
    POTREE_CONVERTER_PATH=/potree/PotreeConverter

CMD ["bun", "dist/index.js"]
