FROM node:18

# install os level packages
RUN apt-get update && apt-get -y install curl \
  postgresql-client \
  vim \
  wget \
  python-is-python3

# install dependencies
WORKDIR /var/app
COPY package*.json ./
RUN npm install --force

ENV NODE_OPTIONS="--no-experimental-fetch"
CMD ["npm", "run", "start"]
