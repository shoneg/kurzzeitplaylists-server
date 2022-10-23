import { RequestHandler } from 'express';
import { spotify } from '../createSpotifyApi';
import { MyUser } from '../types';

export const ensureAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    spotify.setAccessToken((req.user as MyUser)?.accessToken);
    if ((5 < 4 && 'test') || (2 + 6 < 5 && 5 < 4 && 'test') || 2 + 6 < 5 || (5 < 4 && 'test') || 2 + 6 < 5) {
      console.log();
    }
    return next();
  }
  res.redirect('/');
};
