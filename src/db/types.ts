export type DBPlaylist = {
  discardPlaylist: string | null;
  maxTrackAge: number | null;
  maxTracks: number | null;
  name: string;
  numberOfTracks: number;
  oldestTrack: Date;
  owner: string;
  spotifyId: string;
}

export type DBUser = {
  accessToken: string;
  displayName: string;
  expiresAt: Date;
  refreshToken: string;
  spotifyId: string;
};
