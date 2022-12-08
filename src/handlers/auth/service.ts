import { RequestHandler } from 'express';
import DB from '../../db';
import { User } from '../../types';
import { parse as parseUseragent } from 'express-useragent';

export const authView: RequestHandler = (req, res) => {
  if (req.user) {
    res.redirect('..');
  } else {
    res.render('login.html');
  }
};

export const logout: RequestHandler = (req, res, next) => {
  req.logout((e) => {
    if (e) {
      next(e);
    } else {
      res.redirect('/');
    }
  });
};

export const onLogin: RequestHandler = (req, res) => res.redirect('/');

export const deleteView: RequestHandler = (req, res) => res.render('delete.html');

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
            res.redirect('/');
          }
        })
      )
      .catch(next);
  }
};

export const renderNextcloudLoginView: RequestHandler = (req, res) => res.render('nextcloudLogin.html');
export const onNextcloudLogin: RequestHandler = (req, res) => {
  const { headers } = req;
  const token = User.addWaitFor();
  const useragent = headers['user-agent'];
  if (useragent) {
    const browserInfo = parseUseragent(useragent);
    if (browserInfo.isFirefox) {
      res.redirect('/auth/login?token=' + token);
      return;
    }
  }
  res.render('nextcloudLogin.html', { url: '/auth/login?token=' + token });
};
