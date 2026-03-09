export type AggregationMode = 'exact_union' | 'add_missing';

export type AggregationRule = {
  mode: AggregationMode;
  ownerId: string;
  sourcePlaylistIds: string[];
  targetSpotifyId: string;
};

export const isAggregationMode = (value: unknown): value is AggregationMode =>
  value === 'exact_union' || value === 'add_missing';
