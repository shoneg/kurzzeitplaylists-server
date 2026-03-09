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
Object.defineProperty(exports, "__esModule", { value: true });
exports.initPassport = void 0;
const express_session_1 = __importDefault(require("express-session"));
const moment_1 = __importDefault(require("moment"));
const passport_1 = __importDefault(require("passport"));
const __1 = require("..");
const config_1 = require("./config");
const spotifyApi_1 = require("./spotifyApi");
const db_1 = __importDefault(require("./db"));
const logger_1 = __importStar(require("./utils/logger"));
const debug = logger_1.DEBUG.WARN;
const tag = '/passport';
const logger = new logger_1.default(debug, tag);
/**
 * Initialize Passport, session store, and cookie settings.
 */
const initPassport = () => {
    logger.info('Start initializing passport');
    passport_1.default.serializeUser((user, done) => done(null, user));
    passport_1.default.deserializeUser((obj, done) => done(null, obj));
    passport_1.default.use(spotifyApi_1.strategy);
    const dbSessionStore = db_1.default.getInstance().getSessionStore();
    __1.app.use((0, express_session_1.default)({
        cookie: {
            sameSite: 'lax',
            httpOnly: true,
            maxAge: moment_1.default.duration(config_1.SESSION_TIMEOUT, 's').asMilliseconds(),
            secure: config_1.RUNNING_WITH_TLS,
        },
        name: 'sid',
        resave: false,
        saveUninitialized: true,
        secret: config_1.SESSION_SECRET,
        store: dbSessionStore,
        unset: 'destroy',
    }));
    __1.app.use(passport_1.default.initialize());
    __1.app.use(passport_1.default.session());
    logger.info('Init of passport done');
};
exports.initPassport = initPassport;
