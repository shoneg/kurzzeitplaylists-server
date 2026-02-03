import moment from 'moment';
import User from '../types/user';
import SpotifyCredentials from '../types/spotifyCredentials';

describe('User', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2020-01-01T00:00:00Z'));
    (User as any).waitingFor = [];
    User.stopWaitingForCleanup();
  });

  afterEach(() => {
    User.stopWaitingForCleanup();
    jest.useRealTimers();
  });

  it('isInWaitingFor returns true for first element and removes it', () => {
    const t1 = User.addWaitFor('t1');
    const t2 = User.addWaitFor('t2');

    expect(t1).toBe('t1');
    expect(t2).toBe('t2');
    expect(User.isInWaitingFor('t1')).toBe(true);
    expect(User.isInWaitingFor('t1')).toBe(false);
    expect(User.isInWaitingFor('t2')).toBe(true);
  });

  it('startWaitingForCleanup removes expired tokens', () => {
    const now = moment();
    (User as any).waitingFor = [
      { token: 'old', timestamp: now.clone().subtract(31, 's').toDate() },
      { token: 'fresh', timestamp: now.clone().add(40, 's').toDate() },
    ];

    User.startWaitingForCleanup();
    jest.advanceTimersByTime(moment.duration(60, 's').asMilliseconds());

    expect(User.isInWaitingFor('old')).toBe(false);
    expect(User.isInWaitingFor('fresh')).toBe(true);
  });

  it('refreshCredentials uses provided db', async () => {
    const credentials = new SpotifyCredentials('at', moment(), 'rt', 'sid');
    const user = new User(credentials, 'name', 'sid');
    const db = {
      user: { get: jest.fn().mockResolvedValue(user) },
      credentials: { update: jest.fn().mockResolvedValue(undefined) },
    } as any;

    jest.spyOn(credentials, 'refresh').mockResolvedValue(undefined);

    await user.refreshCredentials({ db });

    expect(credentials.refresh).toHaveBeenCalledWith({ db });
    expect(db.user.get).toHaveBeenCalledWith('sid');
  });
});
