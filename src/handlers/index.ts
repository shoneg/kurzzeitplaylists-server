import { ensureAuthenticated, logging } from './customMiddleware';
import { falsePathErrorView } from './service';
import { Router } from 'express';
import authRouter from './auth';
import playlistRouter from './playlists';
import { spotifyErrorHandler } from './errorHandlers';

const rootRouter = Router();

rootRouter.all('*', logging);

rootRouter.get('/', (req, res) => {
  if (!req.user) {
    res.redirect('/auth');
  } else {
    res.redirect('/playlists');
  }
});

rootRouter.use('/auth', authRouter);
rootRouter.use('/playlists', ensureAuthenticated, playlistRouter);
rootRouter.all('*', falsePathErrorView);
rootRouter.use(spotifyErrorHandler);

export default rootRouter;
