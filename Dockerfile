FROM denoland/deno:latest

ARG GIT_REVISION
ENV DENO_DEPLOYMENT_ID=${GIT_REVISION}

WORKDIR /app

COPY . .
RUN deno install --allow-scripts
RUN deno task build
# Cache all remote imports as root so the deno user can access them at runtime
RUN deno cache --unstable-kv routes/**/*.ts lib/*.ts

EXPOSE 8000

# Create persistence directories
RUN mkdir -p /app/uploads /app/data && chown -R deno:deno /app

USER deno

CMD ["deno", "serve", "--unstable-kv", "-A", "_fresh/server.js"]
