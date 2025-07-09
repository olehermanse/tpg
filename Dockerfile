FROM node:20@sha256:6f076db82169a365abca591093bdf020f9e8827a8add8ea3826556c290b340c0 AS build
WORKDIR /tpg
COPY package-lock.json package.json ./
RUN npm install --only=prod
COPY .git .git
COPY src src
COPY public public
COPY add_version.sh add_version.sh
COPY tsconfig.json tsconfig.json
COPY vite.config.js vite.config.js
COPY index.html index.html
RUN rm -rf dist
RUN npm run build
RUN bash add_version.sh

FROM denoland/deno:1.46.3@sha256:5c2dd16fe7794631ce03f3ee48c983fe6240da4c574f4705ed52a091e1baa098 AS test
WORKDIR /tpg
COPY --from=build /tpg /tpg
COPY test test
RUN deno task tsc
RUN deno task test

FROM denoland/deno:1.46.3@sha256:5c2dd16fe7794631ce03f3ee48c983fe6240da4c574f4705ed52a091e1baa098 AS run
WORKDIR /tpg
COPY --from=build /tpg/dist/ dist/
COPY src/ src/
COPY --from=test /tpg/package.json /tpg/package.json
RUN deno cache src/backend/backend.ts
CMD [ "deno" , "run", "--allow-net", "--allow-read", "--allow-env", "src/backend/backend.ts"]
