import { ensureAuthenticated, logging, reroute } from './customMiddleware';
import { falsePathErrorView } from './service';
import { Router } from 'express';
import authRouter from './auth';
import bodyParser from 'body-parser';
import playlistRouter from './playlists';
import { authErrorHandler, spotifyErrorHandler } from './errorHandlers';
import apiRouter from './api';

const rootRouter = Router();

rootRouter.use(bodyParser.urlencoded({ extended: true }));
rootRouter.use(bodyParser.json());
rootRouter.use(logging);
rootRouter.use(reroute);

rootRouter.get('/', (req, res) => {
  if (!req.user) {
    res.redirect('/auth');
  } else {
    res.redirect('/playlists');
  }
});

rootRouter.use('/auth', authRouter);
rootRouter.use('/api', apiRouter);
rootRouter.use('/playlists', ensureAuthenticated, playlistRouter);
rootRouter.use(falsePathErrorView);
rootRouter.use(authErrorHandler);
rootRouter.use(spotifyErrorHandler);

export default rootRouter;
