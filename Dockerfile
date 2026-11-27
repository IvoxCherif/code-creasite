# Site statique Code&Créa servi par Caddy (HTTPS automatique Let's Encrypt)
FROM caddy:2-alpine

COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY *.html /srv/
COPY assets /srv/assets
COPY projets /srv/projets
