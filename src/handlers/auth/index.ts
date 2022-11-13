import { Router } from 'express';
import passport from 'passport';
import { ensureAuthenticated, ensureNextcloudLogin } from '../customMiddleware';
import {
  logout,
  authView,
  deleteView,
  deleteAccount,
  renderNextcloudLoginView,
  onNextcloudLogin,
  onLogin,
} from './service';

const authRouter = Router();

authRouter.get('/', authView);
authRouter.get('/logout', logout);
authRouter.get('/delete', ensureAuthenticated, deleteView);
authRouter.post('/delete', ensureAuthenticated, deleteAccount);
authRouter.get(
  '/login',
  ensureNextcloudLogin,
  passport.authenticate('spotify', {
    scope: ['playlist-read-private', 'playlist-modify-private'],
  })
);
authRouter.get('/callback', passport.authenticate('spotify', { failureRedirect: '..' }), onLogin);
authRouter.get('/nextcloudLoginView', renderNextcloudLoginView);
authRouter.get('/nextcloudLogin', passport.authenticate('oauth2', { session: false }));
authRouter.get(
  '/nextcloudCallback',
  passport.authenticate('oauth2', { failureRedirect: '..', session: false }),
  onNextcloudLogin
);

export default authRouter;
