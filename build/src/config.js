"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildClientRedirectUrl = exports.buildServerPath = exports.SERVER_BASE_PATH = exports.URI = exports.CLIENT_POST_LOGOUT_PATH = exports.CLIENT_POST_LOGIN_PATH = exports.CLIENT_APP_URL = exports.SESSION_TIMEOUT = exports.SESSION_SECRET = exports.RUNNING_WITH_TLS = exports.PROXY_PORT = exports.PORT = exports.HOST = exports.GLOBAL_DEBUG = exports.DB_USER = exports.DB_PORT = exports.DB_PASSWORD = exports.DB_NAME = exports.DB_HOST = exports.CLIENT_SECRET = exports.CLIENT_ID = void 0;
const dotenv_1 = require("dotenv");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * Resolve the most appropriate .env path for the server.
 * Prefers `Server/.env` (next to the compiled output) and falls back
 * to the current working directory for flexibility in dev scripts.
 */
const resolveEnvPath = () => {
    const candidates = [
        path_1.default.resolve(__dirname, '..', '.env'),
        path_1.default.resolve(process.cwd(), '.env'),
    ];
    return candidates.find((candidate) => fs_1.default.existsSync(candidate));
};
(0, dotenv_1.config)({ path: resolveEnvPath() });
const ENV = process.env;
/**
 * Fetch a required environment variable (or return a safe default).
 */
const getEnvVariable = (name, throwOnUndefined = true) => {
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
const parseBoolean = (value) => {
    if (value === 'true') {
        return true;
    }
    else if (value === 'false') {
        return false;
    }
    throw Error(`Cannot parse ${value} to boolean`);
};
/** Spotify application client ID. */
exports.CLIENT_ID = getEnvVariable('CLIENT_ID');
/** Spotify application client secret. */
exports.CLIENT_SECRET = getEnvVariable('CLIENT_SECRET');
/** Database host name or IP. */
exports.DB_HOST = getEnvVariable('DB_HOST');
/** Database name. */
exports.DB_NAME = getEnvVariable('DB_NAME');
/** Database password. */
exports.DB_PASSWORD = getEnvVariable('DB_PASSWORD');
/** Database port. */
exports.DB_PORT = parseInt(getEnvVariable('DB_PORT', '3306'));
/** Database username. */
exports.DB_USER = getEnvVariable('DB_USER');
/** Optional global debug level. */
exports.GLOBAL_DEBUG = (() => {
    const d = getEnvVariable('GLOBAL_DEBUG', '');
    if (d === '') {
        return undefined;
    }
    else {
        return parseInt(d);
    }
})();
/** Hostname for log output and defaults. */
exports.HOST = getEnvVariable('HOST', '127.0.0.1');
/** Port for the HTTP server. */
exports.PORT = parseInt(getEnvVariable('PORT', '8888'));
/** Port advertised for redirects (behind proxy). */
exports.PROXY_PORT = parseInt(getEnvVariable('PROXY_PORT', exports.PORT.toString()));
/** Whether TLS is terminated at the app (affects cookies). */
exports.RUNNING_WITH_TLS = parseBoolean(getEnvVariable('RUNNING_WITH_TLS', 'true'));
/** Express session secret. */
exports.SESSION_SECRET = getEnvVariable('SESSION_SECRET');
/** Session lifetime in seconds. */
exports.SESSION_TIMEOUT = parseInt(getEnvVariable('SESSION_TIMEOUT', '300'));
/** Fully qualified client URL used for post-login redirects. */
exports.CLIENT_APP_URL = getEnvVariable('CLIENT_APP_URL', '');
/** Client route to navigate to after login. */
exports.CLIENT_POST_LOGIN_PATH = getEnvVariable('CLIENT_POST_LOGIN_PATH', '/playlists');
/** Client route to navigate to after logout/delete. */
exports.CLIENT_POST_LOGOUT_PATH = getEnvVariable('CLIENT_POST_LOGOUT_PATH', '/');
/** Canonical public server URL used for redirects and OAuth callbacks. */
exports.URI = (() => {
    const uri = getEnvVariable('URI', 'false');
    return uri === 'false' ? false : uri;
})();
/**
 * Optional base path when the server is mounted behind a path prefix.
 * Example: /kzp-api
 */
exports.SERVER_BASE_PATH = (() => {
    const raw = getEnvVariable('SERVER_BASE_PATH', '');
    if (!raw) {
        return '';
    }
    const withSlash = raw.startsWith('/') ? raw : `/${raw}`;
    return withSlash.length > 1 && withSlash.endsWith('/') ? withSlash.slice(0, -1) : withSlash;
})();
/**
 * Normalize user-provided paths to always start with a leading slash.
 */
const ensureLeadingSlash = (value) => {
    if (!value) {
        return '/';
    }
    return value.startsWith('/') ? value : `/${value}`;
};
/**
 * Prefix a server-local path with the configured base path when needed.
 */
const buildServerPath = (path) => {
    const normalizedPath = ensureLeadingSlash(path);
    if (!exports.SERVER_BASE_PATH) {
        return normalizedPath;
    }
    return `${exports.SERVER_BASE_PATH}${normalizedPath}`;
};
exports.buildServerPath = buildServerPath;
/**
 * Build a client redirect URL that is safe for relative and absolute bases.
 */
const buildClientRedirectUrl = (path) => {
    const normalizedPath = ensureLeadingSlash(path);
    if (!exports.CLIENT_APP_URL) {
        return normalizedPath;
    }
    try {
        return new URL(normalizedPath, exports.CLIENT_APP_URL).toString();
    }
    catch (err) {
        return normalizedPath;
    }
};
exports.buildClientRedirectUrl = buildClientRedirectUrl;
