# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM denoland/deno:latest AS builder

ARG GIT_REVISION
ENV DENO_DEPLOYMENT_ID=${GIT_REVISION}

WORKDIR /app

COPY . .
RUN deno install --allow-scripts
RUN deno task build

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM denoland/deno:latest

ARG GIT_REVISION
ENV DENO_DEPLOYMENT_ID=${GIT_REVISION}
ENV UPLOADS_DIR=/app/uploads

WORKDIR /app

# Copy only what the server needs at runtime
COPY --from=builder /app/_fresh ./_fresh
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/deno.json .
COPY --from=builder /app/deno.lock .
COPY --from=builder /app/drizzle.config.ts .
COPY --from=builder /app/db ./db

# Cache server-side imports using the built entry point
RUN deno cache _fresh/server.js

EXPOSE 8000

RUN mkdir -p /app/uploads /app/data && chown -R deno:deno /app

USER deno

CMD ["deno", "serve", "-A", "_fresh/server.js"]
