import { ensureAuthenticated } from "./customMiddleware";
import { Router } from "express";
import playlistRouter from "./playlists";
import authRouter from "./auth";

const rootRouter = Router();

rootRouter.get('/', (req, res) => {
    if (!req.user) {
        res.redirect('/auth');
    } else {
        res.render('layout.html', { user: req.user });
    }
});

rootRouter.use('/auth', authRouter);
rootRouter.use('/playlists', ensureAuthenticated, playlistRouter);

rootRouter.get('/test', (req, res) => { res.send('works') })

export default rootRouter;