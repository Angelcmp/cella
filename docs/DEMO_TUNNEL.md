# Acceso remoto seguro (túnel)

Para exponer Cella a otros dispositivos sin editar la IP cada vez y sin dejar las cookies desprotegidas, usa un túnel HTTPS. El flujo recomendado aprovecha [Cloudflare Quick Tunnels](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/install-and-setup/tunnel-guide/local/local-tunnel/) porque genera dominios `https://*.trycloudflare.com` sin configuración adicional.

## Requisitos

1. Instala `cloudflared` en tu equipo (`brew install cloudflared`, `winget install Cloudflare.cloudflared` o descarga el binario desde Cloudflare).
2. Exporta tus llaves reales en `.env`/`apps/api/.env` y asegúrate de que `COOKIE_SECURE=true` para que las cookies viajen solo por HTTPS.
3. Ajusta `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_PUBLIC_URL` y `CSRF_ALLOWED_ORIGINS` para apuntar al dominio HTTPS que genere el túnel (ver más abajo cómo obtenerlo automáticamente).

## Cómo iniciarlo

```bash
# Desde la raíz del repo
ENABLE_TUNNEL=true ./start-dev.sh
```

- El backend (FastAPI) corre en `localhost:8000` y el frontend (Next.js) en `localhost:3000` como siempre.
- Con `ENABLE_TUNNEL=true` el script lanza dos procesos `cloudflared tunnel --url ...`, uno por puerto.
- El script imprime las URLs públicas detectadas y un snippet con las variables que debes copiar a tus `.env`.
- Al cerrar con `Ctrl+C`, tanto los servidores como los túneles se apagan.

> Si quieres usar otra herramienta (ngrok, Tailscale, localhost.run, etc.) define `TUNNEL_BIN=ngrok` y adapta los comandos para publicar cada puerto. El script sólo necesita que el binario acepte `http://localhost:<puerto>`.

## Variables típicas

Una vez que tengas los dominios HTTPS, deja así tus `.env` para la demo:

```
COOKIE_SECURE=true
NEXT_PUBLIC_API_URL=https://<subdominio-api>.trycloudflare.com
NEXT_PUBLIC_PUBLIC_URL=https://<subdominio-frontend>.trycloudflare.com
CSRF_ALLOWED_ORIGINS=https://<subdominio-frontend>.trycloudflare.com
```

> Recuerda que Cloudflare asigna dominios aleatorios cada vez. Antes de iniciar la presentación vuelve a ejecutar el script, copia las URLs y reinicia el frontend para que Next.js lea las nuevas variables.

## Verificación rápida

1. Abre el dominio HTTPS desde tu propio navegador: las cookies `access_token` y `XSRF-TOKEN` deben aparecer marcadas como *Secure*.
2. Pide a otro dispositivo que navegue usando la misma URL. No tendrás que editar las IPs manualmente y toda la sesión viajará cifrada.

