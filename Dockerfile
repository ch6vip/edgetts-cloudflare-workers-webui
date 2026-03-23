FROM node:18-alpine

WORKDIR /app

COPY package.json _worker.js server.js kv-store.js ./

RUN mkdir -p /data/kv

EXPOSE 3000

CMD ["node", "server.js"]
