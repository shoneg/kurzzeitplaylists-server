import { RequestHandler } from 'express';
import { spotify } from '../createSpotifyApi';
import { MyUser } from '../types';

export const ensureAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    spotify.setAccessToken((req.user as MyUser)?.accessToken);
    return next();
  }
  res.redirect('/');
};
