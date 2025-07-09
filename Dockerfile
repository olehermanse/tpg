FROM denoland/deno:2.4.1@sha256:1d1c1799f0bc5c63b61f54e07fbfe78a9fc364cb93437437464a0e5dd0769771 AS build
WORKDIR /tpg
COPY package-lock.json package.json ./
RUN deno install
COPY .git .git
COPY src src
COPY public public
COPY add_version.sh add_version.sh
COPY tsconfig.json tsconfig.json
COPY vite.config.js vite.config.js
COPY index.html index.html
RUN rm -rf dist
RUN deno run build
RUN bash add_version.sh

FROM denoland/deno:2.4.1@sha256:1d1c1799f0bc5c63b61f54e07fbfe78a9fc364cb93437437464a0e5dd0769771 AS test
WORKDIR /tpg
COPY --from=build /tpg /tpg
COPY test test
RUN deno install
RUN deno task tsc
RUN deno task test

FROM denoland/deno:2.4.1@sha256:1d1c1799f0bc5c63b61f54e07fbfe78a9fc364cb93437437464a0e5dd0769771 AS run
WORKDIR /tpg
COPY --from=build /tpg/dist/ dist/
COPY src/ src/
COPY --from=test /tpg/package.json /tpg/package.json
COPY --from=test /tpg/package-lock.json /tpg/package-lock.json
COPY deno.json deno.json
RUN deno cache src/backend/backend.ts
CMD [ "deno" , "run", "--allow-net", "--allow-read", "--allow-env", "src/backend/backend.ts"]
