import { aggregateThenCleanup } from '../cron';

describe('cron', () => {
  it('aggregateThenCleanup runs cleanup after aggregation', async () => {
    const calls: string[] = [];
    const aggregateAllConfiguredPlaylists = jest.fn().mockImplementation(async () => {
      calls.push('aggregate');
    });
    const trackDeletion = jest.fn().mockImplementation(() => {
      calls.push('cleanup');
    });

    aggregateThenCleanup({ aggregateAllConfiguredPlaylists, trackDeletion });
    await Promise.resolve();
    await Promise.resolve();

    expect(aggregateAllConfiguredPlaylists).toHaveBeenCalled();
    expect(trackDeletion).toHaveBeenCalled();
    expect(calls).toEqual(['aggregate', 'cleanup']);
  });
});
