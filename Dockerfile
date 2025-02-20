# syntax=docker/dockerfile:1

FROM node:18-alpine AS base

# install os level packages
RUN apk add --no-cache \
  # PostgreSQL client library
  libpq
WORKDIR /var/app
EXPOSE 4000

FROM base AS dev
# install dependencies
COPY package*.json ./
RUN npm ci --include=dev
USER node
COPY . .

ENV NODE_OPTIONS="--no-experimental-fetch"
CMD npm run start:dev

FROM base AS prod
# install dependencies
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
USER node
COPY . .
ENV NODE_OPTIONS="--no-experimental-fetch"
CMD npm run start
