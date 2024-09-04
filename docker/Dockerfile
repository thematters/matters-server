FROM node:18-alpine

# install os level packages
RUN apk add --no-cache \
  # build tools needed by opencc
  g++ \
  make \
  python3 \
  # PostgreSQL client library
  libpq

# install dependencies
WORKDIR /var/app
RUN --mount=type=bind,source=package.json,target=package.json \
  --mount=type=bind,source=package-lock.json,target=package-lock.json \
  --mount=type=cache,target=/root/.npm \
  npm ci --include=dev
USER node
COPY . .

ENV NODE_OPTIONS="--no-experimental-fetch"
CMD ["npm", "run", "start"]
