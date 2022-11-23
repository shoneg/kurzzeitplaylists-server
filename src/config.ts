import { config } from 'dotenv';

config();

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
export const HOST = getEnvVariable('HOST', 'localhost');
export const NEXTCLOUD_CLIENT_ID = getEnvVariable('NEXTCLOUD_CLIENT_ID');
export const NEXTCLOUD_CLIENT_SECRET = getEnvVariable('NEXTCLOUD_CLIENT_SECRET');
export const NEXTCLOUD_URL = getEnvVariable('NEXTCLOUD_URL');
export const PORT = parseInt(getEnvVariable('PORT', '8888'));
export const RUNNING_WITH_TLS = parseBoolean(getEnvVariable('RUNNING_WITH_TLS', 'true') as 'true' | 'false');
export const SESSION_SECRET = getEnvVariable('SESSION_SECRET');
export const SESSION_TIMEOUT = parseInt(getEnvVariable('SESSION_TIMEOUT', '300'));
export const URI = (() => {
  const uri = getEnvVariable('URI', 'false');
  return uri === 'false' ? false : uri;
})();
