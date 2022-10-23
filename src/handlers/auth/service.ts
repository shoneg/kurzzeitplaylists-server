import { RequestHandler } from 'express';

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
    }
  });
  res.redirect('/');
};
