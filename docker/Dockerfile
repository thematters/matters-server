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
COPY package*.json ./
RUN npm install
USER node
COPY . .

ENV NODE_OPTIONS="--no-experimental-fetch"
CMD ["npm", "run", "start"]
