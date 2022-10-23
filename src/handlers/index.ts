import { ensureAuthenticated, logging } from './customMiddleware';
import { Router } from 'express';
import playlistRouter from './playlists';
import authRouter from './auth';

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

export default rootRouter;
