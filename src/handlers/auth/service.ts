import { RequestHandler } from "express";

export const authView: RequestHandler = (req, res) => {
    if (req.user) {
        res.redirect('..');
    } else {
        res.render('login.html');
    }
}

export const logout: RequestHandler = (req, res) => {
    req.logout(e => { if (e) { throw e } });
    res.redirect('/');
}