# use a lightweight node image
FROM node:20-alpine

# set the working directory
WORKDIR /app

# copy package files and install dependencies
COPY package*.json ./
RUN npm install

# copy the rest of backend code
COPY . . 

# expose the node server port
EXPOSE 5001

# cmd to boot the api gateway
CMD ["node", "server.js"]
