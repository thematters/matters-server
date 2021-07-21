FROM node:16

# install os level packages
RUN apt-get update && apt-get -y install curl \
  postgresql-client \
  vim \
  wget

# install dependencies
WORKDIR /var/app
COPY package*.json ./
RUN npm i

CMD ["npm", "run", "start"]
