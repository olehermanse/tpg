FROM docker.io/denoland/deno:2.9.8@sha256:a0d88a7fcbd44f062cba2748e19df67d30290ad12aa203c7c1e0b12462c483f0 AS build
WORKDIR /tpg
RUN apt-get update -y
RUN apt-get install -y git
COPY package-lock.json package.json ./
RUN deno install
COPY .git .git
COPY src src
COPY public public
COPY add_version.sh add_version.sh
COPY tsconfig.json tsconfig.json
COPY vite.config.js vite.config.js
COPY index.html index.html
COPY deno.json deno.json
RUN rm -rf dist
RUN deno run build
RUN bash add_version.sh

FROM docker.io/denoland/deno:2.9.8@sha256:a0d88a7fcbd44f062cba2748e19df67d30290ad12aa203c7c1e0b12462c483f0 AS test
WORKDIR /tpg
COPY --from=build /tpg /tpg
COPY test test
RUN deno install
RUN deno task tsc
RUN deno lint
RUN deno task test

FROM docker.io/denoland/deno:2.9.8@sha256:a0d88a7fcbd44f062cba2748e19df67d30290ad12aa203c7c1e0b12462c483f0 AS run
WORKDIR /tpg
COPY --from=build /tpg/dist/ dist/
COPY src/ src/
COPY --from=test /tpg/package.json /tpg/package.json
COPY --from=test /tpg/package-lock.json /tpg/package-lock.json
COPY deno.json deno.json
RUN deno cache src/backend/backend.ts
CMD [ "deno" , "run", "--allow-net", "--allow-read", "--allow-env", "src/backend/backend.ts"]
