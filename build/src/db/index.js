"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const express_session_1 = __importDefault(require("express-session"));
const moment_1 = __importDefault(require("moment"));
const promise_1 = __importDefault(require("mysql2/promise"));
const express_mysql_session_1 = __importDefault(require("express-mysql-session"));
const config_1 = require("../config");
const logger_1 = __importStar(require("../utils/logger"));
const user_1 = __importDefault(require("./user"));
const credentials_1 = __importDefault(require("./credentials"));
const playlist_1 = __importDefault(require("./playlist"));
const playlistAggregation_1 = __importDefault(require("./playlistAggregation"));
const logger = new logger_1.default(logger_1.DEBUG.WARN, '/db');
const MySQLStore = (0, express_mysql_session_1.default)(express_session_1.default);
/**
 * Singleton database access layer and session store factory.
 */
class DB {
    constructor() {
        this.pool = promise_1.default.createPool({
            host: config_1.DB_HOST,
            user: config_1.DB_USER,
            database: config_1.DB_NAME,
            port: config_1.DB_PORT,
            password: config_1.DB_PASSWORD,
        });
        this._credentials = new credentials_1.default(this.pool);
        this._playlist = new playlist_1.default(this.pool);
        this._playlistAggregation = new playlistAggregation_1.default(this.pool);
        this._user = new user_1.default(this.pool);
    }
    /**
     * Return the shared DB instance.
     */
    static getInstance() {
        return _a.instance;
    }
    get credentials() {
        return this._credentials;
    }
    get playlist() {
        return this._playlist;
    }
    get user() {
        return this._user;
    }
    get playlistAggregation() {
        return this._playlistAggregation;
    }
    /**
     * Execute a raw SQL query against the pool.
     */
    query(sql, values) {
        return this.pool.query(sql, values);
    }
    /**
     * Smoke-test the DB connection.
     */
    testConnection() {
        return new Promise((res) => this.pool
            .query('SELECT * FROM user LIMIT 1')
            .then(() => res(true))
            .catch(() => res(false)));
    }
    /**
     * Create schema if missing using `src/db/createDb.sql`.
     */
    crateDbIfNotExist() {
        return new Promise((res, rej) => {
            (0, fs_1.readFile)('src/db/createDb.sql', (readFileErr, creationScript) => {
                if (readFileErr) {
                    rej(readFileErr);
                    return;
                }
                const statements = creationScript
                    .toString()
                    .split(';')
                    .map((statement) => statement.trim())
                    .filter((statement) => statement.length > 0);
                const creationPromises = statements.map((statement) => this.pool.query(statement));
                Promise.all(creationPromises)
                    .then(() => this.pool
                    .query('ALTER TABLE playlist_aggregation_source DROP FOREIGN KEY fkAggregationSourcePlaylist')
                    .then(() => { })
                    .catch((err) => {
                    if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY' || err.code === 'ER_NO_SUCH_TABLE') {
                        return;
                    }
                    throw err;
                }))
                    .then(() => res())
                    .catch(rej);
            });
        });
    }
    /**
     * Lazily initialize the session store.
     */
    getSessionStore() {
        if (!_a.sessionStore) {
            const store = new MySQLStore({
                host: config_1.DB_HOST,
                user: config_1.DB_USER,
                password: config_1.DB_PASSWORD,
                database: config_1.DB_NAME,
                port: config_1.DB_PORT,
                checkExpirationInterval: moment_1.default.duration(60, 's').asMilliseconds(),
                expiration: moment_1.default.duration(config_1.SESSION_TIMEOUT, 's').asMilliseconds(),
            });
            if (typeof store.on === 'function') {
                store.on('error', (err) => {
                    logger.error('Got error while init of sessionStore:', err);
                });
            }
            _a.sessionStore = store;
        }
        return _a.sessionStore;
    }
}
_a = DB;
(() => {
    _a.instance = new _a();
})();
exports.default = DB;
