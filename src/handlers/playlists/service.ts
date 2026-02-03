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
        const usersOwnPlaylists = spotifyPlaylists
          .filter((p) => p.owner.id === user.spotifyId)
          .filter((p, i, ps) => {
            const ret = ps.findIndex((o) => o.id === p.id) === i;
            if (!ret) {
              logger.warn(`The user ${user.displayName} has two playlists with the id=${p.id} ("${p.name}")`);
            }
            return ret;
          });
        const insertPromise = new Promise<number>((res, rej) => {
          db.playlist
            .filterUnknown(usersOwnPlaylists)
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
          db.user
            .getPlaylists(user)
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
  db.user
    .getPlaylists(user, 'lexicographic_az')
    .then((playlists) => {
      res.render('playlists.html', { user, playlists, recognizeRes });
    })
    .catch(next);
};

export const editPlaylistView: RequestHandler = (req, res, next) => {
  const { id } = req.params;
  const user = User.fromExpress(req.user as Express.User);
  const db = DB.getInstance();
  db.playlist
    .get(id)
    .then((p) =>
      p
        .refresh(user.credentials, true)
        .then((p) =>
          db.user
            .getPlaylists(user, 'lexicographic_az')
            .then((playlists) =>
              res.render('edit.html', {
                name: p.name,
                oldestTrack: {
                  date: p.oldestTrack.format('DD.MM.YYYY'),
                  duration: moment().diff(p.oldestTrack, 'd'),
                },
                numberOfTracks: p.numberOfTracks,
                maxAge: p.maxTrackAge ?? '',
                maxTracks: p.maxTracks ?? '',
                discardPlaylist: p.discardPlaylist ?? '',
                playlists: playlists.filter((x) => x.spotifyId !== p.spotifyId),
              })
            )
            .catch(next)
        )
        .catch(next)
    )
    .catch(next);
};

export const submitEditPlaylist: RequestHandler = (req, res, next) => {
  const { id } = req.params;
  const user = User.fromExpress(req.user as Express.User);
  const { maxAge, maxTracks, discardPlaylist } = req.body;
  const db = DB.getInstance();
  db.playlist
    .get(id)
    .then((p) =>
      db.playlist
        .update(
          {
            spotifyId: id,
            maxTrackAge: maxAge ? maxAge : null,
            maxTracks: maxTracks ? maxTracks : null,
            discardPlaylist: discardPlaylist ? discardPlaylist : null,
          },
          user
        )
        .then(() => res.redirect('/playlists'))
        .catch(next)
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
