# create node.js app from official node image
FROM node:alpine 
# set
WORKDIR /app
# copy two files into the app directory
COPY package.json package-lock.json ./
# runs npm i to build the node app
RUN npm install
# copies server.js into app/
COPY . ./
# exposes the port as specified in server.js
EXPOSE 3000
# runs npm start to launch the app
CMD ["npm","run","start"]