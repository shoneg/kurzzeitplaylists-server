import { createRes, createNext } from '../testUtils';

describe('errorHandlers', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('defaultErrorHandler returns 500', () => {
    jest.isolateModules(() => {
      const { defaultErrorHandler } = require('../handlers/errorHandlers');
      const res = createRes();
      const next = createNext();

      defaultErrorHandler(new Error('boom'), {} as any, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith('Internal server error');
      expect(next).not.toHaveBeenCalled();
    });
  });

  it('authErrorHandler handles registration failures', () => {
    jest.isolateModules(() => {
      const { authErrorHandler } = require('../handlers/errorHandlers');
      const res = createRes();
      const next = createNext();

      authErrorHandler(new Error('registration failed'), {} as any, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith('Registration failed');
      expect(next).not.toHaveBeenCalled();
    });
  });

  it('authErrorHandler handles token errors', () => {
    jest.isolateModules(() => {
      const { authErrorHandler } = require('../handlers/errorHandlers');
      const res = createRes();
      const next = createNext();

      authErrorHandler(new Error('TokenError: expired'), {} as any, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  it('authErrorHandler handles login failures', () => {
    jest.isolateModules(() => {
      const { authErrorHandler } = require('../handlers/errorHandlers');
      const res = createRes();
      const next = createNext();

      authErrorHandler(new Error('login failed'), {} as any, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith('Login failed');
      expect(next).not.toHaveBeenCalled();
    });
  });

  it('authErrorHandler passes through unknown errors', () => {
    jest.isolateModules(() => {
      const { authErrorHandler } = require('../handlers/errorHandlers');
      const res = createRes();
      const next = createNext();
      const err = new Error('something else');

      authErrorHandler(err, {} as any, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  it('spotifyErrorHandler handles 404 responses', () => {
    jest.isolateModules(() => {
      const { spotifyErrorHandler } = require('../handlers/errorHandlers');
      const res = createRes();
      const next = createNext();
      const err: any = {
        message: 'Random error',
        body: { error: { status: 404, message: 'Not found' } },
      };

      spotifyErrorHandler(err, {} as any, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  it('spotifyErrorHandler passes through Spotify web api errors', () => {
    jest.isolateModules(() => {
      const { spotifyErrorHandler } = require('../handlers/errorHandlers');
      const res = createRes();
      const next = createNext();
      const err: any = { message: "Spotify's Web API error" };

      spotifyErrorHandler(err, {} as any, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  it('spotifyErrorHandler handles unknown format', () => {
    jest.isolateModules(() => {
      const { spotifyErrorHandler } = require('../handlers/errorHandlers');
      const res = createRes();
      const next = createNext();
      const err: any = { message: 'boom' };

      spotifyErrorHandler(err, {} as any, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith('There was an unknown error.');
      expect(next).not.toHaveBeenCalled();
    });
  });
});
