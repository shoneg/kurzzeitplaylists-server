import { RequestHandler } from 'express';
import { spotify } from '../../createSpotifyApi';
import Logger, { DEBUG } from '../../utils/logger';

const logger = new Logger(DEBUG.WARN, '/handlers/playlists')

export const playlistsView: RequestHandler = (req, res) => {
  spotify
    .getUserPlaylists()
    .then((data) => {
      const playlists = data.body.items;
      res.render('playlists.html', { playlists });
    })
    .catch((e) => logger.error(e));
};

export const editPlaylistView: RequestHandler = (req, res) => {
  const { id } = req.params;
  spotify
    .getPlaylist(id)
    .then((data) => res.send(data))
    .catch(logger.error);
};
