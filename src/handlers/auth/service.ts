import { RequestHandler } from 'express';
import DB from '../../db';
import { User } from '../../types';
import { buildClientRedirectUrl, CLIENT_POST_LOGIN_PATH, CLIENT_POST_LOGOUT_PATH } from '../../config';

/**
 * Render the login view unless the user is already authenticated.
 */
export const authView: RequestHandler = (req, res) => {
  if (req.user) {
    res.redirect('..');
  } else {
    res.render('login.html');
  }
};

/**
 * Log out the current user and redirect to the client landing page.
 */
export const logout: RequestHandler = (req, res, next) => {
  req.logout((e) => {
    if (e) {
      next(e);
    } else {
      res.redirect(buildClientRedirectUrl(CLIENT_POST_LOGOUT_PATH));
    }
  });
};

/**
 * Redirect to the client landing page after OAuth completes.
 */
export const onLogin: RequestHandler = (req, res) =>
  res.redirect(buildClientRedirectUrl(CLIENT_POST_LOGIN_PATH));

/**
 * Render the account deletion confirmation view.
 */
export const deleteView: RequestHandler = (req, res) => res.render('delete.html');

/**
 * Delete the authenticated user's account and redirect to the client.
 */
export const deleteAccount: RequestHandler = (req, res, next) => {
  const { sure } = req.body;
  if (sure !== "Yes, I'm sure!") {
    res.status(400).send('Incorrect confirmation phrase');
  } else {
    const user = User.fromExpress(req.user as Express.User);
    DB.getInstance()
      .user.delete(user)
      .then(() =>
        req.logout((e) => {
          if (e) {
            next(e);
          } else {
          res.redirect(buildClientRedirectUrl(CLIENT_POST_LOGOUT_PATH));
        }
      })
    )
    .catch(next);
  }
};
