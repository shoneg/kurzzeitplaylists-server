import { Moment } from 'moment';

export type SpotifyCredentials = {
  accessToken: string;
  expiresAt: Moment;
  refreshToken: string;
};

export type Playlist = {
  discardPlaylist?: Playlist;
  maxTrackAge?: number;
  maxTracks?: number;
  name: string;
  numberOfTracks: number;
  oldestTrack: Moment;
  spotifyId: string;
};

export type User = {
  credentials: SpotifyCredentials;
  displayName: string;
  playlists: Playlist[];
  spotifyId: string;
};
