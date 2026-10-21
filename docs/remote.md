# Orbit Web (remote access)

Orbit Web serves the Board, Timeline, Panel and the chat panel to a browser, so you can follow and
steer your chats from your phone while the computer is on. It is the desktop renderer itself, with
`window.radar` answered over HTTP instead of Electron IPC, plus a mobile layout.

It is **off by default**. Turn it on in Settings → Orbit Web.

> **The access token is as good as a shell on your computer.** Anyone holding it can type into
> your Claude Code chats, and chats often run with permissions bypassed. Keep it private, put Orbit
> Web behind HTTPS, and press **New token** if a phone is lost.

## Architecture

```
phone ──HTTPS──▶ tunnel / proxy ──HTTP──▶ 127.0.0.1:4517 (Orbit main process)
                                            ├─ GET  /…               static web app (dist/web)
                                            ├─ GET  /api/session     is the cookie still good?
                                            ├─ POST /api/session     token → session cookie
                                            └─ POST /api/call/<Ch>   one IPC channel, args as a JSON array
```

- **One route table for both transports.** `src/main/routes/shared-routes.ts` builds one handler
  per channel Orbit Web may call. `src/main/ipc.ts` registers that same table over IPC for the
  desktop window, and `src/main/remote/` serves it over HTTP. In demo mode both use `DEMO_ROUTES`.
- **Every channel is classified.** `REMOTE_ACCESS` in `src/shared/remote-access.ts` is a `Record`
  over every routed channel, so a new channel fails the type check until someone decides whether
  the web may call it. The shared table is typed over the remote channels, so a channel marked
  remote cannot lack a handler. `tests/remote/remote-routes.test.ts` checks that every channel is
  decided exactly once.
- **Web client.** `src/web/http-radar.ts` implements `RadarApi` over `fetch`. `src/web/entry.ts`
  signs in, installs it as `window.radar`, then loads the unchanged `src/renderer/app.ts`.
  `build.mjs` derives `dist/web/index.html` from the desktop `index.html` (see `web-page.mjs`), and
  `src/web/web.css` holds every web-only rule.
- **Polling, like the desktop.** The web app polls every 2 seconds as the desktop window does. There
  is no WebSocket and no service worker. API answers are sent with `Cache-Control: no-store`.
- **Bytes over JSON.** Attached images cross as base64 (`src/shared/wire-codec.ts`). Request bodies
  are capped at 25 MB.

## Security model

| Threat | Defence |
| --- | --- |
| Exposure on the network | The server binds `127.0.0.1` only. Reaching it from elsewhere takes a tunnel or proxy you set up. |
| Guessing the token | 256-bit random token. Sign-in is locked for 15 minutes after 10 failures in 10 minutes, counted for the whole server because behind a tunnel every request comes from 127.0.0.1. |
| Timing attacks | The token and the cookie are compared as SHA-256 digests with `timingSafeEqual`. |
| Token theft from the browser | The browser never stores the token. It gets an `HttpOnly; Secure; SameSite=Strict` cookie holding an HMAC of the token. A new token voids every cookie at once. |
| Token in URLs and logs | The pairing link carries the token in the `#fragment`, which never reaches a server. The page strips it from the address bar at once. Requests never take it in a query string. |
| CSRF | Every API call is a `POST` with `Content-Type: application/json`, and its `Origin` must be the local address or your External URL. The server sends no CORS headers, so other sites can neither call it nor read its answers. |
| DNS rebinding | Requests whose `Host` is not `127.0.0.1:<port>`, `localhost:<port>` or the External URL's host get `421`. |
| Clickjacking | `frame-ancestors 'none'`, `X-Frame-Options: DENY`, a strict CSP, `nosniff`, `no-referrer`. |
| Acting on the wrong process | Calls that act on a chat by pid (send, interrupt, rename, recolor, model, effort) must name a chat Orbit lists right now. |
| Auditing | Each request is logged to the main process's stdout as `[orbit-web] <time> <method> <path> <status> <ms>`. The log has no query strings, headers or bodies. |
| Token at rest | `~/.config/orbit/remote.json`, mode `0600`, in a `0700` folder. |

### What stays desktop-only

| Desktop-only | Why |
| --- | --- |
| Close chat | Ends a Claude Code process; too destructive for a lost phone. |
| Go to chat, New window, Emulator / Browser buttons | They focus or open windows on the desktop's screen. |
| Add Shortcut (New chat form), folder picker | They write a command into the launcher file and open a system dialog. |
| Dictation | Streams microphone audio over IPC; left out of the first version. |
| Orbit Web's own settings | A phone can never read or change the token, URL or switch. |

Allowed from the web: reading everything Orbit shows; sending messages and images; interrupting a
turn or a background shell; answering questions; stopping agents; renaming and recoloring;
switching model, effort and permission mode (wide screens only: on a phone the chat's header keeps
just back, its dot and its name); resuming past chats; and opening a chat from a
**saved** New chat shortcut (by name: the command is re-read from the launcher list).

## Setup

1. In Orbit: **Settings → Orbit Web → Allow remote access**. It listens on
   `http://127.0.0.1:4517`. Open that address on the computer to try it.
2. Put it behind HTTPS with one of the options below. Do not expose port 4517 directly.
3. Type the public address into **External URL** and press **Save**. Requests to any other host
   are refused, so this step is required.
4. Scan the **QR code** with the phone. It opens `<external url>/#token=…` and signs in. Or open
   the address and paste the token.
5. Optional: in the phone browser's menu, use **Add to Home Screen**. On iOS the home-screen app
   keeps its own cookies, so sign in once more inside it (paste the token).

### Cloudflare Tunnel (with Cloudflare Access)

Needs a domain on Cloudflare and [`cloudflared`](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/).

```bash
cloudflared tunnel login                               # once, picks the zone
cloudflared tunnel create orbit                        # prints the tunnel id
cloudflared tunnel route dns orbit orbit.example.com   # the public hostname
```

`~/.cloudflared/config.yml`:

```yaml
tunnel: <TUNNEL-ID>
credentials-file: /home/<you>/.cloudflared/<TUNNEL-ID>.json
ingress:
  - hostname: orbit.example.com
    service: http://127.0.0.1:4517
  - service: http_status:404
```

```bash
cloudflared tunnel run orbit                           # or: sudo cloudflared service install
```

If you already run a tunnel, add only the `hostname` / `service` pair above its catch-all rule,
run `cloudflared tunnel route dns <your-tunnel> orbit.example.com`, and restart `cloudflared`.

Strongly recommended: in Cloudflare Zero Trust → **Access → Applications**, add a
**Self-hosted** application for `orbit.example.com` with a policy that allows only your email.
Cloudflare then asks for your identity before Orbit's token is ever in play.

### Tailscale

```bash
tailscale serve --bg 4517      # https://<machine>.<tailnet>.ts.net, reachable from your tailnet only
```

Use the printed `https://…ts.net` address as the External URL. `tailscale funnel` would make it
public; prefer `serve` unless you need access from outside your tailnet.

### Any reverse proxy with TLS

Proxy to `http://127.0.0.1:4517` and keep the original `Host` header. Caddy:

```
orbit.example.com {
  reverse_proxy 127.0.0.1:4517
}
```

nginx: `proxy_pass http://127.0.0.1:4517;` with `proxy_set_header Host $host;`, inside a TLS
`server` block.

## Configuration

`~/.config/orbit/remote.json` (`$XDG_CONFIG_HOME/orbit` when set):

| Key | Meaning |
| --- | --- |
| `enabled` | Whether the server runs (the Settings switch). |
| `port` | Local port, `4517` by default (1024–65535). Edit it by hand while Orbit is closed. |
| `externalUrl` | Your public origin, set from Settings. |
| `token` | Created on first enable, replaced by **New token**. |

`ORBIT_REMOTE_CONFIG_DIR` points Orbit at another folder. In demo mode (`ORBIT_DEMO=1`) the default
folder is inside the demo's own profile, so the demo never touches your real token.

## Troubleshooting

- **421 Unknown host:** the External URL does not match the address you opened. Save the exact
  origin, such as `https://orbit.example.com`.
- **403 Cross-origin request refused:** the page was loaded from an address other than the External
  URL, or a proxy rewrote `Origin`.
- **Sign-in paused:** too many wrong tokens. Wait 15 minutes, or restart Orbit.
- **Signed out suddenly:** someone pressed **New token**. Scan the new QR code.
