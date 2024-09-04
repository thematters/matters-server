# syntax=docker/dockerfile:1

ARG NODE_VERSION=18

FROM node:${NODE_VERSION}-alpine AS base
# install os level packages
RUN apk add --no-cache \
  # build tools needed by opencc
  g++ \
  make \
  python3 \
  # PostgreSQL client library
  libpq
WORKDIR /var/app
EXPOSE 4000

FROM base AS dev
# install dependencies
RUN --mount=type=bind,source=package.json,target=package.json \
  --mount=type=bind,source=package-lock.json,target=package-lock.json \
  --mount=type=cache,target=/root/.npm \
  npm ci --include=dev
USER node
COPY . .

ENV NODE_OPTIONS="--no-experimental-fetch"
CMD npm run start:dev

FROM base AS prod
# install dependencies
RUN --mount=type=bind,source=package.json,target=package.json \
  --mount=type=bind,source=package-lock.json,target=package-lock.json \
  --mount=type=cache,target=/root/.npm \
  npm ci --omit=dev
USER node
COPY . .
ENV NODE_OPTIONS="--no-experimental-fetch"
CMD npm run start
