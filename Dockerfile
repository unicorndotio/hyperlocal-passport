FROM denoland/deno:alpine-2.7.7

# Set the working directory
WORKDIR /app

# Copy dependency definition files first to optimize layer caching
COPY deno.json deno.lock ./

# Install and cache dependencies
RUN deno install

# Copy the rest of the application source code
COPY . .

# Build the production assets
RUN deno task build

# Expose the default application port
EXPOSE 8000

# Create persistence directories and set correct owner permissions for deno user
RUN mkdir -p /app/uploads /app/data && chown -R deno:deno /app

# Run as non-root user
USER deno

# Start the application using deno serve with unstable Deno KV API enabled
CMD ["serve", "--unstable-kv", "-A", "_fresh/server.js"]
