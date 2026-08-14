# Hostinger VPS — BCL Diocese ERP (shared server)

Deploy **alongside** College ERP (nep-erp), Moodle, and Dosa apps without taking ports **80/443**.

| This stack | Host binding | Purpose |
|------------|--------------|---------|
| Web | `127.0.0.1:13100` | Next.js |
| API | `127.0.0.1:14100` | NestJS |
| Postgres | *none* (Docker network only) | `bcl_diocese_pg` volume |
| Redis | *none* | Isolated |
| Compose project | `bcl-diocese` | Unique containers/volumes |

## Critical finding on `82.25.110.120`

- Host Nginx is **not** installed (`nginx: command not found`).
- `nep-erp-nginx-1` owns **80/443**.
- Do **not** install host Nginx or use `docker-compose.prod.yml` (would fight for 80/443).
- Route new domains by adding a vhost file into **nep-erp nginx**.

Other ports already in use: `3000–3002`, `6379`, `8080/8443`, `13000–13002`, `15432`.  
**13100 / 14100 are free** — use them.

## DNS (Hostinger)

Point these A records to `82.25.110.120`:

**turadiocese.in:** `@`, `www`, `erp`, `api`, `sacredheart`  
**sacredheartshrinetura.in:** `@`, `www` (optional `erp`, `api`)

## Safety rule (read first)

**Until you approve an Nginx change, we only:**

1. Take backups (read-only copies)
2. Clone BCL into `/opt/bcl-diocese-erp` (new folder)
3. Run BCL Docker on `127.0.0.1:13100` / `14100` only

**We will NOT** edit `/opt/nep-erp/nginx/nginx.conf`, restart College/Moodle/Dosa, or bind ports 80/443.

### Backup before anything else

After clone (or upload this script alone first):

```bash
bash /opt/bcl-diocese-erp/scripts/backup-shared-proxy.sh
```

Or run the one-liner block in § “Manual backup now” below.

Backups land in `/root/backups/bcl-predeploy-TIMESTAMP/`.

### Manual backup now (run on VPS before clone if you want)

```bash
STAMP=$(date +%Y%m%d-%H%M%S)
DEST=/root/backups/bcl-predeploy-$STAMP
mkdir -p "$DEST"
cp -a /opt/nep-erp/nginx "$DEST/nginx"
cp -a /opt/nep-erp/docker-compose.yml "$DEST/" 2>/dev/null || true
cp -a /opt/nep-erp/docker-compose.prod.yml "$DEST/" 2>/dev/null || true
cp -a /opt/nep-erp/.env "$DEST/nep-erp.env" 2>/dev/null && chmod 600 "$DEST/nep-erp.env" || true
cp -a /opt/mercy-dosa-house/docker-compose.yml "$DEST/mercy-dosa-compose.yml" 2>/dev/null || true
docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}' > "$DEST/docker-ps.txt"
ss -tlnp > "$DEST/ss-tlnp.txt"
sha256sum /opt/nep-erp/nginx/nginx.conf | tee "$DEST/nginx.conf.sha256"
ls -la "$DEST"
echo "Backup OK — no live configs were changed."
```

## Project location on this VPS


College ERP / Dosa live under **`/opt/nep-erp/`** (not `/var/www`).

Put BCL here:

```text
/opt/bcl-diocese-erp
```

Nginx for Dosa is already mounted as:

```text
/opt/nep-erp/nginx/mercydosahouse.conf  →  /etc/nginx/mercydosahouse.conf
```

BCL should follow the same pattern: add `/opt/nep-erp/nginx/bcl-diocese.conf` + one bind mount + one `include` in `nginx.conf`.

## Git upload

```bash
mkdir -p /opt/bcl-diocese-erp
cd /opt/bcl-diocese-erp
git clone <YOUR_GITHUB_REPO_URL> .
```

If the repo is private, use a deploy key or:

```bash
git clone https://<TOKEN>@github.com/<org>/<repo>.git .
```


cp .env.hostinger.example .env.production
nano .env.production   # strong POSTGRES_PASSWORD, JWT_*, admin password; SEED_ON_START=true first boot

docker compose -f docker/docker-compose.hostinger.yml --env-file .env.production up -d --build

docker compose -f docker/docker-compose.hostinger.yml ps
curl -sS http://127.0.0.1:14100/api/v1/health
curl -sS -H "Host: sacredheartshrinetura.in" http://127.0.0.1:13100/ | head
```

## Routing via nep-erp-nginx

```bash
# 1) Find mounted config directory on the host
docker inspect nep-erp-nginx-1 --format '{{json .Mounts}}' | python3 -m json.tool

# 2) See existing site files
docker exec nep-erp-nginx-1 ls -la /etc/nginx/conf.d
docker exec nep-erp-nginx-1 ls -la /etc/nginx/sites-enabled 2>/dev/null || true

# 3) Copy BCL snippet into the HOST path that maps to conf.d (use Source from inspect)
# Example:
#   cp /var/www/bcl-diocese-erp/docker/hostinger/nginx-bcl-diocese.nep-erp.conf \
#      /path/from/inspect/conf.d/bcl-diocese.conf

docker exec nep-erp-nginx-1 nginx -t
docker exec nep-erp-nginx-1 nginx -s reload
```

Use `docker/hostinger/nginx-bcl-diocese.nep-erp.conf` (proxies via `172.17.0.1`, not `127.0.0.1`).

If proxy fails, check gateway:

```bash
ip -4 addr show docker0
```

## SSL

Use the **same certbot / SSL method** already used for College or Dosa domains on this VPS (usually certificates mounted into `nep-erp-nginx`). Or put domains behind Cloudflare (SSL Full).

## After first successful seed

1. https://sacredheartshrinetura.in → Sacred Heart site  
2. https://erp.turadiocese.in/login → ERP  
3. Set **`SEED_ON_START=false`** and **`SEED_MODE=production`** in `.env.production` (required — otherwise demo St. Mary sacraments can reappear)  
4. `docker compose -f docker/docker-compose.hostinger.yml --env-file .env.production up -d --force-recreate api`  
5. Rotate seed passwords  

Production API startup automatically runs `strip-demo-sacraments.mjs` after schema sync to remove the John Marak / 0001/2000 demo marriage if it ever returns.

## What this will NOT do

- Will not stop College ERP / Moodle / Dosa  
- Will not bind host `80`, `443`, `5432`, `6379`, `3000`  
- Will not overwrite other nep-erp site files (adds `bcl-diocese.conf` only)

## Port conflict check

```bash
ss -tlnp | egrep ':80|:443|:13100|:14100|:13000|:3000|:6379'
```

## Rollback

```bash
cd /var/www/bcl-diocese-erp
docker compose -f docker/docker-compose.hostinger.yml down
# remove only the BCL conf file from nep-erp nginx conf.d, then:
docker exec nep-erp-nginx-1 nginx -t && docker exec nep-erp-nginx-1 nginx -s reload
```

Also see: [`HOSTINGER_NEP_ERP_PROXY.md`](HOSTINGER_NEP_ERP_PROXY.md)
