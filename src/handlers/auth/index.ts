import { Router } from 'express';
import passport from 'passport';
import { logout, authView } from './service';

const authRouter = Router();

authRouter.get('/', authView);
authRouter.get('/logout', logout);
authRouter.get(
  '/login',
  passport.authenticate('spotify', {
    scope: ['playlist-read-private', 'playlist-modify-private'],
  })
);
authRouter.get('/callback', passport.authenticate('spotify', { failureRedirect: '/auth' }), function (req, res) {
  res.redirect('/');
});

export default authRouter;
