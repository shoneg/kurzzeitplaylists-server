import { RequestHandler } from 'express';
import { getSpotify } from '../../createSpotifyApi';
import { User } from '../../types';
import Logger, { DEBUG } from '../../utils/logger';

const logger = new Logger(DEBUG.WARN, '/handlers/playlists');

export const playlistsView: RequestHandler = (req, res) => {
  res.render('playlists.html', { user: req.user, playlists: [] });
};

export const editPlaylistView: RequestHandler = (req, res, next) => {
  const { id } = req.params;
  getSpotify(req.user as User)
    .getPlaylist(id)
    .then((data) => res.send(data))
    .catch(next);
};

export const recognize: RequestHandler = (req, res) => {
  res.send();
};
