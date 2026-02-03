import { RequestHandler } from 'express';
import moment from 'moment';
import DB from '../../db';
import { Playlist, User } from '../../types';
import { recognizePlaylistsOfUser } from '../playlists/service';

const toPlaylistSummary = (playlist: Playlist) => ({
  spotifyId: playlist.spotifyId,
  name: playlist.name,
  numberOfTracks: playlist.numberOfTracks,
  maxTrackAge: playlist.maxTrackAge ?? null,
  maxTracks: playlist.maxTracks ?? null,
  discardPlaylist: playlist.discardPlaylist ?? null,
});

export const session: RequestHandler = (req, res) => {
  if (!req.user) {
    res.json({ authenticated: false });
    return;
  }

  const user = User.fromExpress(req.user as Express.User);
  res.json({
    authenticated: true,
    user: {
      displayName: user.displayName,
      spotifyId: user.spotifyId,
    },
  });
};

export const playlists: RequestHandler = (req, res, next) => {
  const db = DB.getInstance();
  const user = User.fromExpress(req.user as Express.User);
  db.user
    .getPlaylists(user, 'lexicographic_az')
    .then((list) => res.json(list.map(toPlaylistSummary)))
    .catch(next);
};

export const playlistDetail: RequestHandler = (req, res, next) => {
  const { id } = req.params;
  const user = User.fromExpress(req.user as Express.User);
  const db = DB.getInstance();

  db.playlist
    .get(id)
    .then((playlist) =>
      playlist
        .refresh(user.credentials, true)
        .then(() =>
          db.playlist
            .get(id)
            .then((fresh) =>
              db.user.getPlaylists(user, 'lexicographic_az').then((playlists) => {
                const oldestTrackDate = fresh.oldestTrack.format('YYYY-MM-DD');
                const ageDays = moment().diff(fresh.oldestTrack, 'd');
                res.json({
                  playlist: {
                    ...toPlaylistSummary(fresh),
                    oldestTrack: {
                      date: oldestTrackDate,
                      ageDays,
                    },
                  },
                  discardOptions: playlists
                    .filter((playlistOption) => playlistOption.spotifyId !== fresh.spotifyId)
                    .map((playlistOption) => ({
                      spotifyId: playlistOption.spotifyId,
                      name: playlistOption.name,
                    })),
                });
              })
            )
            .catch(next)
        )
        .catch(next)
    )
    .catch(next);
};

export const updatePlaylist: RequestHandler = (req, res, next) => {
  const { id } = req.params;
  const user = User.fromExpress(req.user as Express.User);
  const { maxAge, maxTracks, discardPlaylist } = req.body as {
    maxAge?: number | null;
    maxTracks?: number | null;
    discardPlaylist?: string | null;
  };
  const db = DB.getInstance();

  db.playlist
    .update(
      {
        spotifyId: id,
        maxTrackAge: maxAge ?? null,
        maxTracks: maxTracks ?? null,
        discardPlaylist: discardPlaylist ?? null,
      },
      user
    )
    .then(() => res.json({ ok: true }))
    .catch(next);
};

export const recognize: RequestHandler = (req, res, next) => {
  recognizePlaylistsOfUser(User.fromExpress(req.user as Express.User))
    .then((result) => res.json(result))
    .catch(next);
};

export const deleteAccount: RequestHandler = (req, res, next) => {
  const { sure } = req.body as { sure?: string };
  if (sure !== "Yes, I'm sure!") {
    res.status(400).json({ message: 'Incorrect confirmation phrase' });
    return;
  }
  const user = User.fromExpress(req.user as Express.User);
  DB.getInstance()
    .user.delete(user)
    .then(() =>
      req.logout((e) => {
        if (e) {
          next(e);
        } else {
          res.json({ ok: true });
        }
      })
    )
    .catch(next);
};
