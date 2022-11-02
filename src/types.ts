import { Moment } from 'moment';

export type SpotifyCredentials = {
  accessToken: string;
  expiresAt: Moment;
  refreshToken: string;
};

export type Playlist = {
  discardPlaylist?: string;
  maxTrackAge?: number;
  maxTracks?: number;
  name: string;
  numberOfTracks: number;
  oldestTrack: Moment;
  ownerId: string;
  spotifyId: string;
};

export type User = {
  credentials: SpotifyCredentials;
  displayName: string;
  spotifyId: string;
};
