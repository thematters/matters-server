# syntax=docker/dockerfile:1

FROM node:18-alpine AS base

# install os level packages
RUN apk add --no-cache \
  # PostgreSQL client library
  libpq

# install dependencies
WORKDIR /var/app
EXPOSE 4000

COPY package*.json ./
RUN npm install
USER node
COPY . .
ENV NODE_OPTIONS="--no-experimental-fetch"
CMD npm run start
