"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const customMiddleware_1 = require("./customMiddleware");
const service_1 = require("./service");
const express_1 = require("express");
const auth_1 = __importDefault(require("./auth"));
const body_parser_1 = __importDefault(require("body-parser"));
const playlists_1 = __importDefault(require("./playlists"));
const errorHandlers_1 = require("./errorHandlers");
const api_1 = __importDefault(require("./api"));
const config_1 = require("../config");
/**
 * Root router wiring for server-rendered pages and JSON APIs.
 */
const rootRouter = (0, express_1.Router)();
rootRouter.use(body_parser_1.default.urlencoded({ extended: true }));
rootRouter.use(body_parser_1.default.json());
rootRouter.use(customMiddleware_1.logging);
rootRouter.use(customMiddleware_1.reroute);
rootRouter.get('/', (req, res) => {
    if (!req.user) {
        res.redirect((0, config_1.buildServerPath)('/auth'));
    }
    else {
        res.redirect((0, config_1.buildServerPath)('/playlists'));
    }
});
rootRouter.use('/auth', auth_1.default);
rootRouter.use('/api', api_1.default);
rootRouter.use('/playlists', customMiddleware_1.ensureAuthenticated, playlists_1.default);
rootRouter.use(service_1.falsePathErrorView);
rootRouter.use(errorHandlers_1.authErrorHandler);
rootRouter.use(errorHandlers_1.spotifyErrorHandler);
exports.default = rootRouter;
