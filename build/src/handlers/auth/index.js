"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passport_1 = __importDefault(require("passport"));
const customMiddleware_1 = require("../customMiddleware");
const service_1 = require("./service");
/**
 * Routes for login, logout, and account deletion flows.
 */
const authRouter = (0, express_1.Router)();
authRouter.get('/', service_1.authView);
authRouter.get('/logout', service_1.logout);
authRouter.get('/delete', customMiddleware_1.ensureAuthenticated, service_1.deleteView);
authRouter.post('/delete', customMiddleware_1.ensureAuthenticated, service_1.deleteAccount);
authRouter.get('/login', passport_1.default.authenticate('spotify', {
    scope: ['playlist-read-private', 'playlist-read-collaborative', 'playlist-modify-private'],
}));
authRouter.get('/callback', passport_1.default.authenticate('spotify', { failureRedirect: '..' }), service_1.onLogin);
exports.default = authRouter;
