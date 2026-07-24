# Deployment & Domain Configuration

Passaporte Local is designed to serve multiple neighborhoods from a single application and database. This guide covers DNS setup, DigitalOcean deployment with Nginx reverse proxy, and Docker configuration.

---

## Architecture: Multi-Neighborhood Platform

**Domain:** `passaporte.my`  
**Neighborhood subdomains:** `{neighborhood}.passaporte.my` (e.g., `jurere.passaporte.my`, `laguna.passaporte.my`)

### Single App, Multiple Neighborhoods

- One `passport-web` container serves all neighborhoods via subdomain routing
- One `passport-postgres` database stores data for all neighborhoods (with neighborhood field in application layer)
- Residents/businesses/admins access their neighborhood via the subdomain URL

---

## Domain Strategy: Subdomain vs. Path

### Recommendation: Use Subdomains ✅

**Format:** `jurere.passaporte.my` (not `passaporte.my/jurere`)

| Aspect | Subdomain | Path |
|--------|-----------|------|
| **SEO** | ✅ Each neighborhood has independent domain authority | ⚠️ Shared authority; harder to rank separately |
| **Branding** | ✅ Feels like distinct neighborhood app | ❌ Less distinct |
| **Email** | ✅ Can issue per-neighborhood emails (e.g., `contact@jurere.passaporte.my`) | ❌ Requires workaround |
| **Analytics** | ✅ Clean separation per neighborhood | ⚠️ Mixed metrics |
| **SSL Certs** | ✅ Wildcard cert covers all subdomains | ✅ Same cert works |

**Why subdomains work:** Each neighborhood feels independent to users and search engines, while sharing backend infrastructure.

---

## DNS Setup (At Your Registrar)

Point these records to your DigitalOcean droplet IP (e.g., `192.168.1.1`):

```dns
passaporte.my
├─ A Record        passaporte.my           → [DO_DROPLET_IP]
├─ CNAME Record    *.passaporte.my         → passaporte.my
└─ Optional MX     passaporte.my (MX)      → [mail-server] (if email needed)
```

### Steps:

1. **Login to your registrar** (Namecheap, GoDaddy, etc.)
2. **Find DNS Management** for `passaporte.my`
3. **Add these records:**
   - Type: **A**, Name: **@**, Value: **[Your DigitalOcean Droplet IP]**
   - Type: **CNAME**, Name: **\***, Value: **passaporte.my**
4. **Save and wait** (DNS propagation can take 24–48 hours)

### Verify DNS Resolution:

```bash
# Test main domain
nslookup passaporte.my

# Test a neighborhood subdomain
nslookup jurere.passaporte.my

# Advanced: Check all records
dig passaporte.my
dig jurere.passaporte.my
```

---

## DigitalOcean Deployment: Reverse Proxy with Nginx

Your DigitalOcean droplet runs the Docker containers internally. Nginx acts as a public-facing reverse proxy that routes traffic to the correct container.

### 1. Install Nginx and Certbot

```bash
sudo apt update && sudo apt install nginx certbot python3-certbot-nginx
```

### 2. Create Nginx Configuration

**File:** `/etc/nginx/sites-available/passaporte.my`

```nginx
# Main domain (landing page or admin dashboard)
# Point to your landing page service (e.g., port 3000)
# Omit this if you want passaporte.my to redirect to a neighborhood
server {
    listen 80;
    server_name passaporte.my;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Neighborhood subdomains (all *.passaporte.my)
# Routes to the Deno Fresh app (passport-web on port 8000)
server {
    listen 80;
    server_name ~^(?<subdomain>.+)\.passaporte\.my$;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # For WebSocket support (if needed)
        proxy_http_version 1.1;
        proxy_set_header Connection "upgrade";
        proxy_set_header Upgrade $http_upgrade;
    }
}
```

### 3. Enable the Nginx Config

```bash
# Create symlink to enable the site
sudo ln -s /etc/nginx/sites-available/passaporte.my /etc/nginx/sites-enabled/

# Test Nginx syntax
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### 4. Enable HTTPS with Let's Encrypt

```bash
# Auto-generate and install wildcard SSL certificate
sudo certbot --nginx -d passaporte.my -d '*.passaporte.my'
```

**What happens:**
- Certbot generates a wildcard SSL cert for all subdomains
- Automatically updates your Nginx config with HTTPS settings
- Sets up auto-renewal (checks daily)

**Verify auto-renewal:**
```bash
sudo certbot renew --dry-run
```

---

## Docker Configuration

### Container Naming Convention

**Pattern:** `passport-<service>`

| Service | Container Name | Port |
|---------|-----------------|------|
| PostgreSQL | `passport-postgres` | 5432 (internal only) |
| Deno Fresh | `passport-web` | 8000 (proxied via Nginx) |
| Drizzle Gateway | `passport-drizzle-gateway` | 4983 (optional, for Drizzle Studio) |

### Volumes

```
passport-postgres-data        # Database files (persisted)
passport-uploads              # User uploads (persisted)
passport-drizzle-gateway-data # Drizzle metadata (optional)
```

### Build & Deploy Strategy

The app is **built locally and pushed to GitHub Container Registry (GHCR)**. The production droplet only pulls and runs the pre-built image — it never builds from source. This avoids OOM issues on small droplets and makes deploys fast and reproducible.

**Registry:** `ghcr.io/unicorndotio`  
**Compose override:** `docker-compose.prod.yml` swaps the `build:` block for the registry `image:` on production, keeping `docker-compose.yml` identical to local.

#### First-time authentication

Generate a GitHub Personal Access Token at github.com → Settings → Developer settings → Personal access tokens with scopes:
- `write:packages` — needed on your Mac to push
- `read:packages` — needed on the droplet to pull

```bash
# On your Mac
echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u unicorndotio --password-stdin

# On the droplet
echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u unicorndotio --password-stdin
```

#### From your Mac — ship a new version

```bash
deno task deploy
```

Individual steps if needed:
```bash
deno task deploy:build   # docker build --platform linux/amd64 ...
deno task deploy:push    # docker push ghcr.io/unicorndotio/passport-web:latest
```

#### On the droplet — pull and restart

```bash
# Pull the new image
deno task deploy:pull

# Restart the web container with the new image
deno task deploy:up
```

`deploy:up` uses `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`, which merges the production override (pre-built image, no build step) on top of the base config.

#### Local development (unchanged)

```bash
# Build from source and start everything
docker compose up -d --build

# Or just start if already built
docker compose up -d
```

### Verify containers are running

```bash
docker ps | grep passport-

# View logs
docker logs -f passport-web
```

---

## Environment Variables

All variables are in `.env`. Update for production:

```bash
# Database
DB_USER=root
DB_PASSWORD=<strong-random-password>
DB_NAME=passport

# Authentication secrets (generate with: openssl rand -hex 32)
BETTER_AUTH_SECRET=<random-32-byte-hex>

# Public URLs (use your domain)
APP_BASE_URL=https://jurere.passaporte.my
BETTER_AUTH_URL=https://jurere.passaporte.my

# Deployment
GIT_REVISION=prod-v1.0

# Drizzle Gateway (optional)
DRIZZLE_MASTERPASS=<strong-random-password>
```

### Generate Secure Secrets

```bash
# Generate BETTER_AUTH_SECRET
openssl rand -hex 32

# Generate DRIZZLE_MASTERPASS
openssl rand -hex 16
```

---

## Nginx Troubleshooting

### Domain not resolving?

```bash
# Check DNS resolution
nslookup jurere.passaporte.my
dig jurere.passaporte.my +short

# On your droplet, test localhost
curl -H "Host: jurere.passaporte.my" http://localhost:8000
```

### Nginx not routing correctly?

```bash
# Test Nginx config syntax
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# View Nginx error log
sudo tail -f /var/log/nginx/error.log

# View access log
sudo tail -f /var/log/nginx/access.log
```

### App returning wrong Host header?

Add these headers to your Nginx config (already included above):
```nginx
proxy_set_header Host $host;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

---

## SSL Certificate Management

### View certificate details

```bash
sudo certbot certificates
```

### Manual renewal (if needed)

```bash
sudo certbot renew --force-renewal -d passaporte.my -d '*.passaporte.my'
```

### Test auto-renewal

```bash
sudo certbot renew --dry-run
```

---

## Production Deployment Checklist

- [x] Domain `passaporte.my` purchased and registered
- [x] DNS A record pointing to DigitalOcean droplet IP
- [x] DNS wildcard CNAME (`*.passaporte.my`) configured
- [ ] Nginx installed and configured at `/etc/nginx/sites-available/passaporte.my`
- [ ] Nginx config enabled (symlink in `/etc/nginx/sites-enabled/`)
- [ ] Let's Encrypt wildcard SSL certificate installed via certbot
- [ ] GitHub Personal Access Token created with `write:packages` (Mac) and `read:packages` (droplet) scopes
- [ ] `docker login ghcr.io` run on both Mac and droplet
- [ ] Image built and pushed from Mac: `deno task deploy`
- [ ] Image pulled on droplet: `deno task deploy:pull`
- [ ] Containers started on droplet: `deno task deploy:up`
- [ ] Environment variables set in `.env` (strong passwords, HTTPS URLs)
- [ ] Database migrations applied: `deno task db:migrate`
- [ ] Nginx logs checked: `sudo tail -f /var/log/nginx/error.log`
- [ ] App logs checked: `docker logs passport-web`
- [ ] Test neighborhood URL works: `https://jurere.passaporte.my`
- [ ] SSL certificate auto-renewal verified: `sudo certbot renew --dry-run`

---

## Adding a New Neighborhood

When you launch Laguna or another neighborhood, **no Docker changes needed**:

1. **Add the subdomain to DNS:**
   ```dns
   CNAME   laguna   →   passaporte.my
   ```
   (Already covered by the wildcard `*.passaporte.my`)

2. **Add the neighborhood in the application database:**
   - Insert a new neighborhood record in the `neighborhoods` table (if your schema uses one)
   - Or scope users/businesses by subdomain at the application layer

3. **Update Nginx (optional):**
   - The existing wildcard config already handles all subdomains
   - No Nginx changes needed

4. **Optionally add a subdomain-specific config:**
   ```nginx
   server {
       listen 80;
       server_name laguna.passaporte.my;
       location / {
           proxy_pass http://localhost:8000;
           # Same headers as above
       }
   }
   ```
   (But the wildcard regex already handles this)

The single `passport-web` container will route all neighborhoods by reading the `Host` header. Your application code should:
- Read the `Host` header or subdomain
- Filter data by neighborhood
- Show neighborhood-specific branding

---

## Monitoring & Logs

### Container Status

```bash
# List all Passaporte containers
docker ps | grep passport-

# View all Passaporte containers (including stopped)
docker ps -a | grep passport-
```

### Application Logs

```bash
# Real-time logs from the web app
docker logs -f passport-web

# Last 50 lines
docker logs --tail 50 passport-web

# With timestamps
docker logs -f --timestamps passport-web
```

### Database Logs

```bash
# PostgreSQL logs
docker logs -f passport-postgres
```

### Nginx Logs

```bash
# Access log (all requests)
sudo tail -f /var/log/nginx/access.log | grep passaporte

# Error log (important for debugging)
sudo tail -f /var/log/nginx/error.log
```

---

## Backup Strategy

### Database Backup

```bash
# Dump PostgreSQL to file
docker exec passport-postgres pg_dump -U root passport > backup.sql

# Restore from backup
cat backup.sql | docker exec -i passport-postgres psql -U root passport
```

### Uploads Backup

```bash
# Backup uploads directory
docker run --rm -v passport-uploads:/uploads -v $(pwd):/backup \
  alpine tar czf /backup/uploads-backup.tar.gz -C /uploads .

# Restore uploads
docker run --rm -v passport-uploads:/uploads -v $(pwd):/backup \
  alpine tar xzf /backup/uploads-backup.tar.gz -C /uploads
```

### Automate Backups

```bash
# Create a daily backup script at /home/deploy/backup.sh
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Database backup
docker exec passport-postgres pg_dump -U root passport | \
  gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Keep only last 7 days
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +7 -delete

# Add to crontab: 0 2 * * * /home/deploy/backup.sh
```

---

## References

- [Nginx documentation](https://nginx.org/en/)
- [Let's Encrypt / Certbot](https://certbot.eff.org/)
- [Docker documentation](https://docs.docker.com/)
- [PostgreSQL backup docs](https://www.postgresql.org/docs/current/backup.html)

 #2 — Pointing Your Domain to DigitalOcean

  Architecture Setup:

   1. DNS Setup (in your registrar, e.g., Namecheap, GoDaddy):
   DNS Records for passaporte.my:
   ├─ A Record:        @  → [Your DigitalOcean Droplet IP]
   ├─ CNAME Record: 
      *.  → passaporte.my  (wildcard for subdomains)
   └─ Optional MX:     mx  → [if email needed]
   2. DigitalOcean Setup (reverse proxy):
   Since you have multiple services on the droplet, use Nginx as a reverse proxy:
   # /etc/nginx/sites-available/passaporte.my

   # Main domain (landing page or default)
   server {
     listen 80;
     server_name passaporte.my;
     location / {
       proxy_pass http://localhost:3000;  # or wherever your landing page lives
     }
   }

   # Subdomains (Jurerê, future neighborhoods)
   server {
     listen 80;
     server_name ~^(?<subdomain>.+)\.passaporte\.my$;
     location / {
       proxy_pass http://localhost:8000;  # Your Deno Fresh app
     }
   }
   3. Enable HTTPS (free via Let's Encrypt):
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d passaporte.my -d '*.passaporte.my'