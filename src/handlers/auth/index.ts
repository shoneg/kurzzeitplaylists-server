import { Router } from 'express';
import passport from 'passport';
import { ensureAuthenticated } from '../customMiddleware';
import {
  logout,
  authView,
  deleteView,
  deleteAccount,
  onLogin,
} from './service';

const authRouter = Router();

authRouter.get('/', authView);
authRouter.get('/logout', logout);
authRouter.get('/delete', ensureAuthenticated, deleteView);
authRouter.post('/delete', ensureAuthenticated, deleteAccount);
authRouter.get(
  '/login',
  passport.authenticate('spotify', {
    scope: ['playlist-read-private', 'playlist-modify-private'],
  })
);
authRouter.get('/callback', passport.authenticate('spotify', { failureRedirect: '..' }), onLogin);

export default authRouter;
