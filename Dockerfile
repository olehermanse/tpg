FROM docker.io/denoland/deno:2.6.6@sha256:08941c4fcc2f0448d34ca2452edeb5bca009bed29313079cfad0e5e2fa37710f AS build
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

FROM docker.io/denoland/deno:2.6.6@sha256:08941c4fcc2f0448d34ca2452edeb5bca009bed29313079cfad0e5e2fa37710f AS test
WORKDIR /tpg
COPY --from=build /tpg /tpg
COPY test test
RUN deno install
RUN deno task tsc
RUN deno lint
RUN deno task test

FROM docker.io/denoland/deno:2.6.6@sha256:08941c4fcc2f0448d34ca2452edeb5bca009bed29313079cfad0e5e2fa37710f AS run
WORKDIR /tpg
COPY --from=build /tpg/dist/ dist/
COPY src/ src/
COPY --from=test /tpg/package.json /tpg/package.json
COPY --from=test /tpg/package-lock.json /tpg/package-lock.json
COPY deno.json deno.json
RUN deno cache src/backend/backend.ts
CMD [ "deno" , "run", "--allow-net", "--allow-read", "--allow-env", "src/backend/backend.ts"]
