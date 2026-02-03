import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

const resolveEnvPath = (): string | undefined => {
  const candidates = [
    path.resolve(__dirname, '..', '.env'),
    path.resolve(process.cwd(), '.env'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
};

config({ path: resolveEnvPath() });

const ENV = process.env;

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

const parseBoolean = (value: 'true' | 'false'): boolean => {
  if (value === 'true') {
    return true;
  } else if (value === 'false') {
    return false;
  }
  throw Error(`Cannot parse ${value} to boolean`);
};

export const CLIENT_ID = getEnvVariable('CLIENT_ID');
export const CLIENT_SECRET = getEnvVariable('CLIENT_SECRET');
export const DB_HOST = getEnvVariable('DB_HOST');
export const DB_NAME = getEnvVariable('DB_NAME');
export const DB_PASSWORD = getEnvVariable('DB_PASSWORD');
export const DB_PORT = parseInt(getEnvVariable('DB_PORT', '3306'));
export const DB_USER = getEnvVariable('DB_USER');
export const GLOBAL_DEBUG = (() => {
  const d = getEnvVariable('GLOBAL_DEBUG', '');
  if (d === '') {
    return undefined;
  } else {
    return parseInt(d);
  }
})();
export const HOST = getEnvVariable('HOST', '127.0.0.1');
export const PORT = parseInt(getEnvVariable('PORT', '8888'));
export const PROXY_PORT = parseInt(getEnvVariable('PROXY_PORT', PORT.toString()));
export const RUNNING_WITH_TLS = parseBoolean(getEnvVariable('RUNNING_WITH_TLS', 'true') as 'true' | 'false');
export const SESSION_SECRET = getEnvVariable('SESSION_SECRET');
export const SESSION_TIMEOUT = parseInt(getEnvVariable('SESSION_TIMEOUT', '300'));
export const CLIENT_APP_URL = getEnvVariable('CLIENT_APP_URL', '');
export const CLIENT_POST_LOGIN_PATH = getEnvVariable('CLIENT_POST_LOGIN_PATH', '/playlists');
export const CLIENT_POST_LOGOUT_PATH = getEnvVariable('CLIENT_POST_LOGOUT_PATH', '/');
export const URI = (() => {
  const uri = getEnvVariable('URI', 'false');
  return uri === 'false' ? false : uri;
})();

const ensureLeadingSlash = (value: string): string => {
  if (!value) {
    return '/';
  }
  return value.startsWith('/') ? value : `/${value}`;
};

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
