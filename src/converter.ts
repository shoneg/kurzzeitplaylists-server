import moment from 'moment';
import { Playlist } from './types';

export const playlistObjectSimplified2Playlist = (
  simplePlaylist: SpotifyApi.PlaylistObjectSimplified,
  oldestTrackValue = moment()
): Playlist => {
  const { name, tracks, owner, id } = simplePlaylist;
  const playlist: Playlist = {
    name,
    numberOfTracks: tracks.total,
    oldestTrack: oldestTrackValue,
    ownerId: owner.id,
    spotifyId: id,
  };
  return playlist;
};
