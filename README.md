# Kurzzeitplaylists Server

The server provides Spotify OAuth, playlist syncing, and the JSON API consumed by the client.

## Requirements

- Node.js (LTS recommended)
- MySQL 8+ (or compatible)
- Spotify Developer app credentials

## Quick Start

1. Create `Server/.env` (copy from `Server/.env.example`).
2. Fill out the required environment variables.
3. Run the server.

```bash
cd Server
yarn install
yarn start
```

The server listens on `http://127.0.0.1:8888` by default.

## Environment Variables

- `CLIENT_ID`: Spotify app client ID.
- `CLIENT_SECRET`: Spotify app client secret.
- `HOST`: Hostname used in logs and defaults.
- `PORT`: Server port (default `8888`).
- `PROXY_PORT`: External port if behind a proxy.
- `RUNNING_WITH_TLS`: Set to `true` when TLS terminates at the app.
- `SESSION_SECRET`: Secret used to sign session cookies.
- `SESSION_TIMEOUT`: Session duration in seconds.
- `URI`: Canonical server URL used for OAuth callbacks and redirects.
- `CLIENT_APP_URL`: Fully qualified client URL for post-login redirects.
- `CLIENT_POST_LOGIN_PATH`: Path to navigate to after login (default `/playlists`).
- `CLIENT_POST_LOGOUT_PATH`: Path to navigate to after logout (default `/`).
- `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT`: Database configuration.

## OAuth Setup

Make sure your Spotify app has the correct callback URL:

## Scripts

- `yarn start`: Run the dev server with `nodemon`.
- `yarn test`: Run Jest tests.

## Troubleshooting

- If you’re redirected to server routes after login, verify `CLIENT_APP_URL` is set and the server is reading `Server/.env`.
- If cookies are missing, ensure `RUNNING_WITH_TLS` matches your actual protocol.
