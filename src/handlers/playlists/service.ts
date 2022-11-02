import { RequestHandler } from 'express';
import { playlistObjectSimplified2Playlist } from '../../converter';
import { getSpotify } from '../../createSpotifyApi';
import { DB } from '../../db';
import { filterUnknownPlaylists, getPlaylists } from '../../db/service';
import { User } from '../../types';
import Logger, { DEBUG } from '../../utils/logger';

const logger = new Logger(DEBUG.WARN, '/handlers/playlists');

const recognizePlaylistsOfUser = (user: User): Promise<{ newPlaylists: number; deletedPlaylists: number }> => {
  const db = DB.getInstance();
  const spotify = getSpotify(user);
  return new Promise<{ newPlaylists: number; deletedPlaylists: number }>((res, rej) => {
    getPlaylists(0, 50, spotify)
      .then((spotifyPlaylists) => {
        const usersOwnPlaylists = spotifyPlaylists.filter((p) => p.owner.id === user.spotifyId);
        const insertPromise = new Promise<number>((res, rej) => {
          filterUnknownPlaylists(usersOwnPlaylists)
            .then((notYetInserted) => {
              if (notYetInserted.length === 0) {
                res(0);
              } else {
                const playlists = notYetInserted.map((p) => playlistObjectSimplified2Playlist(p));
                db.insertPlaylists(playlists).then(res).catch(rej);
              }
            })
            .catch(rej);
        });
        const deletePromise = new Promise<number>((res, rej) => {
          db.getPlaylistsOfUser(user)
            .then((usersPlaylists) => {
              const spotifyListIds = usersOwnPlaylists.map((p) => p.id);
              const toDelete = usersPlaylists.filter((p) => !spotifyListIds.includes(p.spotifyId));
              if (toDelete.length === 0) {
                res(0);
              } else {
                db.deletePlaylists(toDelete).then(res).catch(rej);
              }
            })
            .catch(rej);
        });
        Promise.all([insertPromise, deletePromise])
          .then(([newPlaylists, deletedPlaylists]) => {
            res({ newPlaylists, deletedPlaylists });
          })
          .catch(rej);
      })
      .catch(rej);
  });
};

export const playlistsView: RequestHandler = (req, res, next) => {
  const db = DB.getInstance();
  const recognizeRes =
    req.query.newOnes && req.query.deleted
      ? { newPlaylists: req.query.newOnes, deletedPlaylists: req.query.deleted }
      : undefined;
  db.getPlaylistsOfUser(req.user as User)
    .then((playlists) => {
      res.render('playlists.html', { user: req.user, playlists, recognizeRes });
    })
    .catch(next);
};

export const editPlaylistView: RequestHandler = (req, res, next) => {
  const { id } = req.params;
  getSpotify(req.user as User)
    .getPlaylist(id)
    .then((data) => res.send(data))
    .catch(next);
};

export const recognize: RequestHandler = (req, res, next) => {
  recognizePlaylistsOfUser(req.user as User)
    .then(({ newPlaylists, deletedPlaylists }) =>
      res.redirect('/playlists?newOnes=' + newPlaylists + '&deleted=' + deletedPlaylists)
    )
    .catch(next);
};
