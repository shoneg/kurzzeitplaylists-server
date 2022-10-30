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
export const HOST = getEnvVariable('HOST', 'localhost');
export const PORT = parseInt(getEnvVariable('PORT', '8888'));
export const SECURE_COOKIES_ONLY = parseBoolean(getEnvVariable('SECURE_COOKIES_ONLY', 'true') as 'true' | 'false');
export const SESSION_SECRET = getEnvVariable('SESSION_SECRET');
export const SESSION_TIMEOUT = parseInt(getEnvVariable('SESSION_TIMEOUT', '300'));
