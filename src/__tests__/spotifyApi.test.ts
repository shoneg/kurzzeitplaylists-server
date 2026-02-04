import moment from 'moment';
import { refreshAllSessions } from '../spotifyApi';

describe('spotifyApi', () => {
  it('refreshAllSessions refreshes credentials before expireBefore', async () => {
    const c1 = { refresh: jest.fn().mockResolvedValue(undefined) };
    const c2 = { refresh: jest.fn().mockResolvedValue(undefined) };
    const db = {
      credentials: {
        getAllExpiresBefore: jest.fn().mockResolvedValue([c1, c2]),
      },
    } as any;

    await refreshAllSessions(moment('2020-01-01T00:00:00Z'), { db });

    expect(db.credentials.getAllExpiresBefore).toHaveBeenCalled();
    expect(c1.refresh).toHaveBeenCalledWith({ db });
    expect(c2.refresh).toHaveBeenCalledWith({ db });
  });
});
