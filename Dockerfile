FROM node:10.13

# install dependencies
WORKDIR /var/app
COPY package*.json ./
RUN npm i

# intall pm2 and add config file
RUN npm i -g pm2
COPY processes.config.js ./

# install os level packages
RUN apt-get update && apt-get -y install vim curl wget

ENTRYPOINT ["pm2", "start", "processes.config.js", "--update-env", "--no-daemon"]
