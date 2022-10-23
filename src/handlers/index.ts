import { ensureAuthenticated, logging } from './customMiddleware';
import { falsePathErrorView } from './service';
import { Router } from 'express';
import authRouter from './auth';
import playlistRouter from './playlists';

const rootRouter = Router();

rootRouter.all('*', logging);

rootRouter.get('/', (req, res) => {
  if (!req.user) {
    res.redirect('/auth');
  } else {
    res.render('layout.html', { user: req.user });
  }
});

rootRouter.use('/auth', authRouter);
rootRouter.use('/playlists', ensureAuthenticated, playlistRouter);
rootRouter.all('*', falsePathErrorView);

export default rootRouter;
