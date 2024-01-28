FROM node:20 AS build
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

FROM node:20 AS test
WORKDIR /tpg
COPY --from=build /tpg /tpg
COPY test test
RUN npm install --include=dev
RUN npm run tsc
RUN npm run test

FROM denoland/deno:1.39.4 AS run
WORKDIR /tpg
COPY --from=build /tpg/dist/ dist/
COPY src/ src/
COPY --from=test /tpg/package.json /tpg/package.json
CMD [ "deno" , "run", "--allow-net", "--allow-read", "--allow-env", "src/backend/backend.ts"]
