import moment from 'moment';
import SpotifyWebApi from 'spotify-web-api-node';
import DB from './db';
import { getSpotify, refreshAllSessions } from './spotifyApi';
import { Playlist } from './types';
import Logger, { DEBUG } from './utils/logger';

const logger = new Logger(DEBUG.INFO, '/cron');

const d: (inp: Parameters<typeof moment.duration>[0], unit: Parameters<typeof moment.duration>[1]) => number = (
  inp,
  unit
) => moment.duration(inp, unit).asMilliseconds();

const refreshSessions = () => {
  logger.info('Start token refreshing');
  const expiresBefore = moment().subtract(6, 'h');
  refreshAllSessions(expiresBefore)
    .then(() => {})
    .catch(() => {});
};

const addTracks = (
  spotify: SpotifyWebApi,
  playlistId: string,
  tracks: Parameters<typeof spotify.addTracksToPlaylist>[1]
): Promise<void> => {
  return new Promise<void>((res, rej) => {
    spotify
      .addTracksToPlaylist(playlistId, tracks)
      .then((result) => {
        if (result.statusCode === 201 || result.statusCode === 200) {
          res();
        } else {
          logger.error('Got an error while adding tracks to playlist:', result);
          rej('Got error while adding tracks to playlist');
        }
      })
      .catch((err) => {
        logger.error(err), rej(err);
      });
  });
};

const removeTracks = (
  spotify: SpotifyWebApi,
  playlistId: string,
  tracks: Parameters<typeof spotify.removeTracksFromPlaylist>[1]
): Promise<void> => {
  return new Promise<void>((res, rej) => {
    spotify
      .removeTracksFromPlaylist(playlistId, tracks)
      .then((removingResponse) => {
        if (removingResponse.statusCode === 200) {
          res();
        } else {
          logger.error('Got an error while removing tracks from playlist:', removingResponse);
          rej('Got an error while removing tracks from playlist');
        }
      })
      .catch((err) => {
        logger.error(err), rej(err);
      });
  });
};

export const trackDeletion = () => {
  logger.info('Start track deletion');
  const db = DB.getInstance();
  db.playlist
    .getTrackDeletionCandidates()
    .then((playlists) => {
      const promises = playlists.map((p) => {
        return new Promise<void>((res, rej) => {
          db.credentials.get(p.ownerId).then((c) => {
            const spotify = getSpotify(c);
            const maxAgeMoment = moment().subtract(p.maxTrackAge, 'd');
            Playlist.getTracks(spotify, p.spotifyId, undefined, undefined, 'added_at,track.uri')
              .then((tracks) => {
                let remove: SpotifyApi.PlaylistTrackObject[] = [];
                if (p.maxTrackAge !== undefined && moment(p.oldestTrack).isBefore(maxAgeMoment)) {
                  remove = tracks.filter((t) => moment(t.added_at).isBefore(maxAgeMoment));
                }
                if (p.maxTracks && tracks.length - remove.length > p.maxTracks) {
                  const sortedRest = tracks
                    .filter((t) => !remove.includes(t))
                    .sort((a, b) => moment(a.added_at).diff(moment(b.added_at)));
                  remove = remove.concat(sortedRest.slice(0, sortedRest.length - p.maxTracks));
                }
                const tooOldUris = remove.map((t) => ({ uri: t.track?.uri })).filter((t) => t.uri !== undefined) as {
                  uri: string;
                }[];
                const getRemovePromise = () =>
                  removeTracks(spotify, p.spotifyId, tooOldUris)
                    .then(() =>
                      p
                        .refresh(c, true)
                        .then(() => res())
                        .catch(() => rej())
                    )
                    .catch(() => rej());
                if (p.discardPlaylist) {
                  addTracks(
                    spotify,
                    p.discardPlaylist,
                    tooOldUris.map((u) => u.uri)
                  )
                    .then(getRemovePromise)
                    .catch(() => rej());
                } else {
                  getRemovePromise();
                }
              })
              .catch(() => rej());
          });
        });
      });
      Promise.all(promises)
        .then(() => {})
        .catch(() => {});
    })
    .catch(() => {});
};

const cron = () => {
  setInterval(refreshSessions, d(30, 'm'));
  setInterval(trackDeletion, d(1, 'm'));
};

export default cron;
