import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

/**
 * Resolve the most appropriate .env path for the server.
 * Prefers `Server/.env` (next to the compiled output) and falls back
 * to the current working directory for flexibility in dev scripts.
 */
const resolveEnvPath = (): string | undefined => {
  const candidates = [
    path.resolve(__dirname, '..', '.env'),
    path.resolve(process.cwd(), '.env'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
};

config({ path: resolveEnvPath() });

const ENV = process.env;

/**
 * Fetch a required environment variable (or return a safe default).
 */
const getEnvVariable: (name: string, throwOnUndefined?: true | string) => string = (name, throwOnUndefined = true) => {
  const throwError = () => {
    throw new Error(`Cannot find '${name}' in .env`);
  };
  const fromEnv = ENV[name];
  if (!fromEnv) {
    throwOnUndefined === true ? throwError() : throwOnUndefined;
    return '';
  }
  return fromEnv;
};

/**
 * Parse a strict boolean value from the environment.
 */
const parseBoolean = (value: 'true' | 'false'): boolean => {
  if (value === 'true') {
    return true;
  } else if (value === 'false') {
    return false;
  }
  throw Error(`Cannot parse ${value} to boolean`);
};

/** Spotify application client ID. */
export const CLIENT_ID = getEnvVariable('CLIENT_ID');
/** Spotify application client secret. */
export const CLIENT_SECRET = getEnvVariable('CLIENT_SECRET');
/** Database host name or IP. */
export const DB_HOST = getEnvVariable('DB_HOST');
/** Database name. */
export const DB_NAME = getEnvVariable('DB_NAME');
/** Database password. */
export const DB_PASSWORD = getEnvVariable('DB_PASSWORD');
/** Database port. */
export const DB_PORT = parseInt(getEnvVariable('DB_PORT', '3306'));
/** Database username. */
export const DB_USER = getEnvVariable('DB_USER');
/** Optional global debug level. */
export const GLOBAL_DEBUG = (() => {
  const d = getEnvVariable('GLOBAL_DEBUG', '');
  if (d === '') {
    return undefined;
  } else {
    return parseInt(d);
  }
})();
/** Hostname for log output and defaults. */
export const HOST = getEnvVariable('HOST', '127.0.0.1');
/** Port for the HTTP server. */
export const PORT = parseInt(getEnvVariable('PORT', '8888'));
/** Port advertised for redirects (behind proxy). */
export const PROXY_PORT = parseInt(getEnvVariable('PROXY_PORT', PORT.toString()));
/** Whether TLS is terminated at the app (affects cookies). */
export const RUNNING_WITH_TLS = parseBoolean(getEnvVariable('RUNNING_WITH_TLS', 'true') as 'true' | 'false');
/** Express session secret. */
export const SESSION_SECRET = getEnvVariable('SESSION_SECRET');
/** Session lifetime in seconds. */
export const SESSION_TIMEOUT = parseInt(getEnvVariable('SESSION_TIMEOUT', '300'));
/** Fully qualified client URL used for post-login redirects. */
export const CLIENT_APP_URL = getEnvVariable('CLIENT_APP_URL', '');
/** Client route to navigate to after login. */
export const CLIENT_POST_LOGIN_PATH = getEnvVariable('CLIENT_POST_LOGIN_PATH', '/playlists');
/** Client route to navigate to after logout/delete. */
export const CLIENT_POST_LOGOUT_PATH = getEnvVariable('CLIENT_POST_LOGOUT_PATH', '/');
/** Canonical public server URL used for redirects and OAuth callbacks. */
export const URI = (() => {
  const uri = getEnvVariable('URI', 'false');
  return uri === 'false' ? false : uri;
})();

/**
 * Normalize user-provided paths to always start with a leading slash.
 */
const ensureLeadingSlash = (value: string): string => {
  if (!value) {
    return '/';
  }
  return value.startsWith('/') ? value : `/${value}`;
};

/**
 * Build a client redirect URL that is safe for relative and absolute bases.
 */
export const buildClientRedirectUrl = (path: string): string => {
  const normalizedPath = ensureLeadingSlash(path);
  if (!CLIENT_APP_URL) {
    return normalizedPath;
  }
  try {
    return new URL(normalizedPath, CLIENT_APP_URL).toString();
  } catch (err) {
    return normalizedPath;
  }
};
