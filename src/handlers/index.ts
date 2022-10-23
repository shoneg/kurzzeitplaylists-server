import { Router } from "express";
import passport from "passport";
import { authCallbackPath, spotify } from "../createSpotifyApi";
import { ensureAuthenticated } from "./customMiddleware";

const rootRouter = Router();

rootRouter.get('/test', (req, res) => res.send({ arg: 'works' }))

rootRouter.get('/', (req, res) => {
    res.render('login.html', { user: req.user });
});

rootRouter.get('/playlists', ensureAuthenticated, (req, res) => {
    spotify.getUserPlaylists().then(data => {
        const playlists = data.body.items;
        res.render('playlists.html', { playlists });
    }).catch(e => console.error(e))
})

rootRouter.get('/edit/:id', ensureAuthenticated, (req, res) => {
    const { id } = req.params;
    spotify.getPlaylist(id).then((data) => res.send(data)).catch(console.error);
})

rootRouter.get('/login', function (req, res) {
    res.render('login.html', { user: req.user });
});

// GET /auth/spotify
//   Use passport.authenticate() as route middleware to authenticate the
//   request. The first step in spotify authentication will involve redirecting
//   the user to spotify.com. After authorization, spotify will redirect the user
//   back to this application at /auth/spotify/callback
rootRouter.get(
    '/auth/spotify',
    passport.authenticate('spotify', {
        scope: ['playlist-read-private', 'playlist-modify-private'],
    })
);

// GET /auth/spotify/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request. If authentication fails, the user will be redirected back to the
//   login page. Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
rootRouter.get(
    authCallbackPath,
    passport.authenticate('spotify', { failureRedirect: '/login' }),
    function (req, res) {
        res.redirect('/');
    }
);

rootRouter.get('/logout', function (req, res) {
    req.logout({}, (e) => { throw e });
    res.redirect('/');
});

export default rootRouter;