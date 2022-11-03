export type CredentialsModel = {
  accessToken: string;
  expiresAt: Date;
  refreshToken: string;
  spotifyId: string;
};

export type PlaylistModel = {
  discardPlaylist: string | null;
  maxTrackAge: number | null;
  maxTracks: number | null;
  name: string;
  numberOfTracks: number;
  oldestTrack: Date;
  owner: string;
  spotifyId: string;
};

export type UserModel = {
  displayName: string;
  spotifyId: string;
};
