FROM node:10.13

# install dependencies
WORKDIR /var/app
COPY package*.json ./
RUN npm i

# install os level packages
RUN apt-get update && apt-get -y install curl \
  postgresql-client \
  vim \
  wget

CMD ["npm", "run", "start"]
