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
exports.logging = exports.reroute = exports.ensureNextcloudLogin = exports.ensureAuthenticated = void 0;
const moment_1 = __importDefault(require("moment"));
const config_1 = require("../config");
const types_1 = require("../types");
const logger_1 = __importStar(require("../utils/logger"));
const logger = new logger_1.default(logger_1.DEBUG.WARN, 'customMiddleware');
/**
 * Ensure the request has a valid authenticated user session.
 */
const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        const user = types_1.User.fromExpress(req.user);
        if ((0, moment_1.default)(user.credentials.expiresAt).isBefore((0, moment_1.default)().add(15, 's'))) {
            // Proactively refresh tokens to avoid user-visible failures.
            user.refreshCredentials().then((updatedUser) => {
                req.user = updatedUser;
                return next();
            });
        }
        else {
            return next();
        }
    }
    else {
        res.redirect((0, config_1.buildServerPath)('/'));
    }
};
exports.ensureAuthenticated = ensureAuthenticated;
/**
 * Ensure a valid Nextcloud token was provided during login.
 */
const ensureNextcloudLogin = (req, res, next) => {
    const { token } = req.query;
    if (!token) {
        res
            .status(400)
            .send(`<p>Missing token! Got to the <a href='${(0, config_1.buildServerPath)('/')}'>start page</a> to get one.</p>`);
    }
    else if (!types_1.User.isInWaitingFor(token.toString())) {
        res
            .status(401)
            .send(`<p>You're token expired. Try to <a href='${(0, config_1.buildServerPath)('/auth')}'>login</a> again.</p>`);
    }
    else {
        next();
    }
};
exports.ensureNextcloudLogin = ensureNextcloudLogin;
/**
 * Reroute requests to the canonical host when `URI` is configured.
 */
const reroute = (req, res, next) => {
    const url = new URL(req.protocol + '://' + req.get('host') + req.originalUrl);
    if (config_1.URI && new URL(config_1.URI).host !== url.host) {
        res.redirect(config_1.URI + url.pathname + url.search + url.hash);
    }
    else {
        next();
    }
};
exports.reroute = reroute;
/**
 * Log each incoming request for visibility while developing.
 */
const logging = (req, res, next) => {
    logger.log(`requested ${req.method} '${req.originalUrl}'`);
    next();
};
exports.logging = logging;
