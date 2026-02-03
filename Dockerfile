FROM node:lts-alpine
ENV PORT=3000
RUN npm install --global nodemon
RUN npm install --global ts-node
RUN npm install --global typescript
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --production=false --silent && mv node_modules ../
COPY . .
EXPOSE 3000
RUN chown -R node /usr/src/app
USER node
CMD ["npm", "start"]
