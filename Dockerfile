FROM node:18-alpine

RUN addgroup -S app && adduser -S app -G app \
 && mkdir -p /data/kv && chown -R app:app /data

WORKDIR /app

COPY --chown=app:app package.json _worker.js server.js kv-store.js ./

USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
