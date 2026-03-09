"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAccount = exports.deleteView = exports.onLogin = exports.logout = exports.authView = void 0;
const db_1 = __importDefault(require("../../db"));
const types_1 = require("../../types");
const config_1 = require("../../config");
/**
 * Render the login view unless the user is already authenticated.
 */
const authView = (req, res) => {
    if (req.user) {
        res.redirect('..');
    }
    else {
        res.render('login.html');
    }
};
exports.authView = authView;
/**
 * Log out the current user and redirect to the client landing page.
 */
const logout = (req, res, next) => {
    req.logout((e) => {
        if (e) {
            next(e);
        }
        else {
            res.redirect((0, config_1.buildClientRedirectUrl)(config_1.CLIENT_POST_LOGOUT_PATH));
        }
    });
};
exports.logout = logout;
/**
 * Redirect to the client landing page after OAuth completes.
 */
const onLogin = (req, res) => res.redirect((0, config_1.buildClientRedirectUrl)(config_1.CLIENT_POST_LOGIN_PATH));
exports.onLogin = onLogin;
/**
 * Render the account deletion confirmation view.
 */
const deleteView = (req, res) => res.render('delete.html');
exports.deleteView = deleteView;
/**
 * Delete the authenticated user's account and redirect to the client.
 */
const deleteAccount = (req, res, next) => {
    const { sure } = req.body;
    if (sure !== "Yes, I'm sure!") {
        res.status(400).send('Incorrect confirmation phrase');
    }
    else {
        const user = types_1.User.fromExpress(req.user);
        db_1.default.getInstance()
            .user.delete(user)
            .then(() => req.logout((e) => {
            if (e) {
                next(e);
            }
            else {
                res.redirect((0, config_1.buildClientRedirectUrl)(config_1.CLIENT_POST_LOGOUT_PATH));
            }
        }))
            .catch(next);
    }
};
exports.deleteAccount = deleteAccount;
