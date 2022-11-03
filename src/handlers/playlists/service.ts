import { RequestHandler } from 'express';
import moment from 'moment';
import { getSpotify } from '../../spotifyApi';
import DB from '../../db';
import { Playlist, User } from '../../types';
import Logger, { DEBUG } from '../../utils/logger';

const logger = new Logger(DEBUG.WARN, '/handlers/playlists');

const recognizePlaylistsOfUser = (user: User): Promise<{ newPlaylists: number; deletedPlaylists: number }> => {
  const db = DB.getInstance();
  const spotify = getSpotify(user);
  return new Promise<{ newPlaylists: number; deletedPlaylists: number }>((res, rej) => {
    Playlist.getMany(0, 50, spotify)
      .then((spotifyPlaylists) => {
        const usersOwnPlaylists = spotifyPlaylists.filter((p) => p.owner.id === user.spotifyId);
        const insertPromise = new Promise<number>((res, rej) => {
          db.playlist.filterUnknown(usersOwnPlaylists)
            .then((notYetInserted) => {
              if (notYetInserted.length === 0) {
                res(0);
              } else {
                const playlists = notYetInserted.map((p) => Playlist.fromApiObj(p));
                db.playlist.insert(playlists).then(res).catch(rej);
              }
            })
            .catch(rej);
        });
        const deletePromise = new Promise<number>((res, rej) => {
          db.user.getPlaylists(user)
            .then((usersPlaylists) => {
              const spotifyListIds = usersOwnPlaylists.map((p) => p.id);
              const toDelete = usersPlaylists.filter((p) => !spotifyListIds.includes(p.spotifyId));
              if (toDelete.length === 0) {
                res(0);
              } else {
                db.playlist.delete(toDelete).then(res).catch(rej);
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
  const user = User.fromExpress(req.user as Express.User);
  const recognizeRes =
    req.query.newOnes && req.query.deleted
      ? { newPlaylists: req.query.newOnes, deletedPlaylists: req.query.deleted }
      : undefined;
  db.user.getPlaylists(user)
    .then((playlists) => {
      res.render('playlists.html', { user, playlists, recognizeRes });
    })
    .catch(next);
};

export const editPlaylistView: RequestHandler = (req, res, next) => {
  const { id } = req.params;
  /*
  - bei Anzeige laden oldesttrack setzen
  - nach löschen oldesttrack neu setzen (nur falls es ein maxAge gibt)
  - sonst nie oldesttrack setzen
  - an diesen Stellen auch numberOfTracks setzen
  - bei Anzeige auch name aktualisieren
  */
  getSpotify(User.fromExpress(req.user as Express.User))
    .getPlaylist(id, { fields: 'id,name,tracks(total,items(added_at,id),next)' })
    .then((data) =>
      res.render('edit.html', {
        name: data.body.name,
        oldestTrack: { date: moment().format('DD.MM.YY'), duration: 0 },
        numberOfTracks: data.body.tracks.total,
      })
    )
    .catch(next);
};

export const recognize: RequestHandler = (req, res, next) => {
  recognizePlaylistsOfUser(User.fromExpress(req.user as Express.User))
    .then(({ newPlaylists, deletedPlaylists }) =>
      res.redirect('/playlists?newOnes=' + newPlaylists + '&deleted=' + deletedPlaylists)
    )
    .catch(next);
};
