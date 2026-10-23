### Build and run

```
docker compose up --build -d
```

The app runs at http://localhost:8001. Stop it with `docker compose down`.

The image is built in two stages. First, Node and pnpm run `pnpm build`, which writes `out/` and `sw.js`. Then nginx serves `out/` using `deploy/nginx.conf`, which has the same rules as `deploy/apache-vhost.conf`.

### Deploying

Service workers need HTTPS, except on `localhost`. On a server, put a TLS-terminating reverse proxy (Caddy, Traefik, nginx, Apache…) in front of the container's port 80.

```
docker build --platform=linux/amd64 -t mygym .
```

Note: `.git` is excluded from the build context, so the Next build ID inside the image is `dev`. The service-worker cache version is based on file contents, so updates are still detected.
