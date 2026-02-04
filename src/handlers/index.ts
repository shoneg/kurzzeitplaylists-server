import { ensureAuthenticated, logging, reroute } from './customMiddleware';
import { falsePathErrorView } from './service';
import { Router } from 'express';
import authRouter from './auth';
import bodyParser from 'body-parser';
import playlistRouter from './playlists';
import { authErrorHandler, spotifyErrorHandler } from './errorHandlers';
import apiRouter from './api';
import { buildServerPath } from '../config';

/**
 * Root router wiring for server-rendered pages and JSON APIs.
 */
const rootRouter = Router();

rootRouter.use(bodyParser.urlencoded({ extended: true }));
rootRouter.use(bodyParser.json());
rootRouter.use(logging);
rootRouter.use(reroute);

rootRouter.get('/', (req, res) => {
  if (!req.user) {
    res.redirect(buildServerPath('/auth'));
  } else {
    res.redirect(buildServerPath('/playlists'));
  }
});

rootRouter.use('/auth', authRouter);
rootRouter.use('/api', apiRouter);
rootRouter.use('/playlists', ensureAuthenticated, playlistRouter);
rootRouter.use(falsePathErrorView);
rootRouter.use(authErrorHandler);
rootRouter.use(spotifyErrorHandler);

export default rootRouter;
