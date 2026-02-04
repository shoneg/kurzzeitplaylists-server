FROM node:20-alpine AS builder
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --production=false --silent
COPY . .
RUN npm run build

FROM node:20-alpine
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/package.json ./package.json
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/build ./build
COPY --from=builder /usr/src/app/src/db/createDb.sql ./src/db/createDb.sql
EXPOSE 3000
RUN chown -R node /usr/src/app
USER node
CMD ["node", "build/index.js"]
