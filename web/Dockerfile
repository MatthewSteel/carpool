FROM node:10
WORKDIR /app
COPY yarn.lock package.json server.js ./
RUN yarn
CMD ["node", "server.js"]
