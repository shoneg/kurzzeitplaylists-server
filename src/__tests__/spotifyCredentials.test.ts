import moment from 'moment';
import SpotifyCredentials from '../types/spotifyCredentials';

describe('SpotifyCredentials', () => {
  it('refresh updates access token and expiresAt and calls db update', async () => {
    const creds = new SpotifyCredentials('old', moment('2020-01-01T00:00:00Z'), 'rt', 'sid');
    const db = { credentials: { update: jest.fn().mockResolvedValue(undefined) } } as any;
    const spotify = {
      refreshAccessToken: jest.fn().mockResolvedValue({
        body: { access_token: 'new', refresh_token: 'newrt', expires_in: 60 },
      }),
    } as any;
    const now = moment('2020-01-01T00:00:00Z');

    await creds.refresh({ db, spotify, now });

    expect(creds.accessToken).toBe('new');
    expect(creds.refreshToken).toBe('newrt');
    expect(creds.expiresAt.toISOString()).toBe(now.clone().add(60, 's').toISOString());
    expect(db.credentials.update).toHaveBeenCalledWith(creds, 'sid');
  });

  it('refresh preserves refreshToken when missing', async () => {
    const creds = new SpotifyCredentials('old', moment('2020-01-01T00:00:00Z'), 'rt', 'sid');
    const db = { credentials: { update: jest.fn().mockResolvedValue(undefined) } } as any;
    const spotify = {
      refreshAccessToken: jest.fn().mockResolvedValue({
        body: { access_token: 'new', expires_in: 60 },
      }),
    } as any;

    await creds.refresh({ db, spotify, now: moment('2020-01-01T00:00:00Z') });

    expect(creds.refreshToken).toBe('rt');
  });
});
