FROM node:18-alpine

LABEL org.opencontainers.image.title="CF-TTS Proxy Server" \
      org.opencontainers.image.description="OpenAI-compatible Edge TTS proxy" \
      org.opencontainers.image.version="1.2" \
      com.docker.logging.max-size="10m" \
      com.docker.logging.max-file="3"

RUN addgroup -S app && adduser -S app -G app \
 && mkdir -p /data/kv && chown -R app:app /data

WORKDIR /app

COPY --chown=app:app package.json _worker.js server.js kv-store.js ./

USER app

ENV PORT=3000 \
    DATA_DIR=/data/kv \
    LOG_LEVEL=info

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
