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
exports.app = void 0;
const errorHandlers_1 = require("./src/handlers/errorHandlers");
const config_1 = require("./src/config");
const passport_1 = require("./src/passport");
const consolidate_1 = __importDefault(require("consolidate"));
const express_1 = __importDefault(require("express"));
const logger_1 = __importStar(require("./src/utils/logger"));
const handlers_1 = __importDefault(require("./src/handlers"));
const db_1 = __importDefault(require("./src/db"));
const cron_1 = __importDefault(require("./src/cron"));
const types_1 = require("./src/types");
const logger = new logger_1.default(logger_1.DEBUG.INFO, 'index');
// Initialize the express engine
exports.app = (0, express_1.default)();
// init db
const db = db_1.default.getInstance();
db.crateDbIfNotExist()
    .then(() => {
    logger.info('db creation done');
})
    .catch((err) => {
    if (err.fatal) {
        logger.error('Got fatal error while creating db:', err.message);
        throw Error(err.name + '\n' + err.stack);
    }
    else {
        logger.warn(`Got error (${err.name}) while creating db:`, err.message);
    }
});
db.testConnection().then((suc) => {
    if (suc) {
        logger.info('db connection test was successful');
    }
    else {
        logger.error("db connection test wasn't successful");
    }
});
// configure Express
exports.app.set('views', __dirname + '/src/views');
exports.app.set('view engine', 'html');
// reverse proxy
exports.app.set('trust proxy', 1);
(0, passport_1.initPassport)();
types_1.User.startWaitingForCleanup();
exports.app.engine('html', consolidate_1.default.nunjucks);
exports.app.locals.basePath = config_1.SERVER_BASE_PATH;
exports.app.use(config_1.SERVER_BASE_PATH || '', handlers_1.default);
exports.app.use(errorHandlers_1.defaultErrorHandler);
(0, cron_1.default)();
// Server setup
exports.app.listen(config_1.PORT, '0.0.0.0', 100, () => {
    logger.info(`Kurzzeitplaylistserver is running on ${config_1.RUNNING_WITH_TLS ? 'https' : 'http'}://${config_1.HOST}:${config_1.PORT}/`);
});
