FROM node:18

# install os level packages
RUN apt-get update && apt-get -y install \
  postgresql-client \
  python-is-python3 \
  && rm -rf /var/lib/apt/lists/*

# install dependencies
WORKDIR /var/app
COPY package*.json ./
RUN npm install

ENV NODE_OPTIONS="--no-experimental-fetch"
CMD ["npm", "run", "start"]
