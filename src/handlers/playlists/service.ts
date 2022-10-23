import { RequestHandler } from 'express';
import { spotify } from '../../createSpotifyApi';

export const playlistsView: RequestHandler = (req, res) => {
  spotify
    .getUserPlaylists()
    .then((data) => {
      const playlists = data.body.items;
      res.render('playlists.html', { playlists });
    })
    .catch((e) => console.error(e));
};

export const editPlaylistView: RequestHandler = (req, res) => {
  const { id } = req.params;
  spotify
    .getPlaylist(id)
    .then((data) => res.send(data))
    .catch(console.error);
};
