import { RequestHandler } from 'express';
import { spotify } from '../../createSpotifyApi';
import Logger, { DEBUG } from '../../utils/logger';

const logger = new Logger(DEBUG.WARN, '/handlers/playlists');

export const playlistsView: RequestHandler = (req, res) => {
  res.render('playlists.html', { user: req.user });
};

export const editPlaylistView: RequestHandler = (req, res) => {
  const { id } = req.params;
  spotify
    .getPlaylist(id)
    .then((data) => res.send(data))
    .catch((e) => logger.error(e));
};

export const recognize: RequestHandler = (req, res) => {
  res.send();
};
