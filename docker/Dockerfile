FROM node:18

# install os level packages
RUN apt-get update && apt-get -y install curl \
  postgresql-client \
  wget \
  python-is-python3

# install dependencies
WORKDIR /var/app
COPY package*.json ./
RUN npm install

ENV NODE_OPTIONS="--no-experimental-fetch"
CMD ["npm", "run", "start"]
