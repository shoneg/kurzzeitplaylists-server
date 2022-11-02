import { DBPlaylist, DBUser } from './types';
import { Playlist, SpotifyCredentials, User } from '../types';
import Logger, { DEBUG } from '../utils/logger';
import moment from 'moment';

const logger = new Logger(DEBUG.WARN, '/db/converter');

export const dbPlaylists2Playlist = (dbPlaylist: DBPlaylist): Playlist => {
  const { discardPlaylist, maxTrackAge, maxTracks, oldestTrack, owner: ownerId, ...rest } = dbPlaylist;
  const f = (v: any) => v ?? undefined;
  const playlist: Playlist = {
    ...rest,
    discardPlaylist: f(discardPlaylist),
    maxTrackAge: f(maxTrackAge),
    maxTracks: f(maxTracks),
    oldestTrack: moment(oldestTrack),
    ownerId,
  };
  return playlist;
};

export const dbUser2User = (dbUser: DBUser): User => {
  const { accessToken, refreshToken, expiresAt, ...rest } = dbUser;
  const credentials: SpotifyCredentials = { accessToken, refreshToken, expiresAt: moment(expiresAt) };
  const user: User = { credentials, ...rest };
  return user;
};
