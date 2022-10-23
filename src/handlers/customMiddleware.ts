import { RequestHandler } from "express";
import { spotify } from "../createSpotifyApi";
import { MyUser } from "../types";

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected. If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed. Otherwise, the user will be redirected to the
//   start page.
export const ensureAuthenticated: RequestHandler = (req, res, next) => {
    if (req.isAuthenticated()) {
        spotify.setAccessToken((req.user as MyUser)?.accessToken)
        return next();
    }
    res.redirect('/');
}