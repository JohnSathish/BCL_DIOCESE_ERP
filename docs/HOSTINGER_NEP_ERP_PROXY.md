# Shared VPS note — nep-erp-nginx owns 80/443

On Hostinger VPS `82.25.110.120` the host has **no** system Nginx.
`nep-erp-nginx-1` Docker container binds **80/443** for all sites.

## Do NOT

- Install host `nginx` and bind 80/443
- Run `docker-compose.prod.yml` (it also wants 80/443)
- Change College ERP / Moodle / Dosa containers

## Do

1. Run BCL stack on localhost ports only (`13100` web, `14100` api) via `docker-compose.hostinger.yml`
2. Add vhost snippets **into nep-erp nginx config** so new domains proxy to those ports
3. Issue SSL via that same nginx container (certbot volume) or Cloudflare Full

## Port map (this server)

| App | Ports |
|-----|-------|
| nep-erp nginx | 80, 443 |
| nep-erp web/api | 3000, 3001 |
| donboscocollege | 3002 |
| Moodle | 8080, 8443 |
| Dosa (docker-*) | 13000–13002 |
| **BCL Diocese (new)** | **127.0.0.1:13100**, **127.0.0.1:14100** |

See `docs/HOSTINGER_VPS.md` § “Routing via nep-erp-nginx”.
