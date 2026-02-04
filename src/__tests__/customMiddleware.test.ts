import moment from 'moment';
import { createRes, createNext } from '../testUtils';

describe('customMiddleware', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  describe('ensureNextcloudLogin', () => {
    it('returns 400 when token is missing', () => {
      jest.doMock('../types', () => ({ User: { isInWaitingFor: jest.fn() } }));
      jest.doMock('../config', () => ({ URI: false }));

      jest.isolateModules(() => {
        const { ensureNextcloudLogin } = require('../handlers/customMiddleware');
        const res = createRes();
        const next = createNext();
        const req: any = { query: {} };

        ensureNextcloudLogin(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalled();
        expect(next).not.toHaveBeenCalled();
      });
    });

    it('returns 401 when token is not waiting', () => {
      jest.doMock('../types', () => ({ User: { isInWaitingFor: jest.fn().mockReturnValue(false) } }));
      jest.doMock('../config', () => ({ URI: false }));

      jest.isolateModules(() => {
        const { ensureNextcloudLogin } = require('../handlers/customMiddleware');
        const res = createRes();
        const next = createNext();
        const req: any = { query: { token: 'abc' } };

        ensureNextcloudLogin(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalled();
        expect(next).not.toHaveBeenCalled();
      });
    });

    it('calls next when token is valid', () => {
      jest.doMock('../types', () => ({ User: { isInWaitingFor: jest.fn().mockReturnValue(true) } }));
      jest.doMock('../config', () => ({ URI: false }));

      jest.isolateModules(() => {
        const { ensureNextcloudLogin } = require('../handlers/customMiddleware');
        const res = createRes();
        const next = createNext();
        const req: any = { query: { token: 'abc' } };

        ensureNextcloudLogin(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });
    });
  });

  describe('ensureAuthenticated', () => {
    it('redirects when not authenticated', () => {
      jest.doMock('../types', () => ({ User: { fromExpress: jest.fn() } }));
      jest.doMock('../config', () => ({ URI: false }));

      jest.isolateModules(() => {
        const { ensureAuthenticated } = require('../handlers/customMiddleware');
        const res = createRes();
        const next = createNext();
        const req: any = { isAuthenticated: () => false };

        ensureAuthenticated(req, res, next);

        expect(res.redirect).toHaveBeenCalledWith('/');
        expect(next).not.toHaveBeenCalled();
      });
    });

    it('refreshes credentials when expiring soon', async () => {
      jest.doMock('../types', () => ({ User: { fromExpress: jest.fn() } }));
      jest.doMock('../config', () => ({ URI: false }));

      await new Promise<void>((resolve) => {
        jest.isolateModules(() => {
          const { ensureAuthenticated } = require('../handlers/customMiddleware');
          const { User } = require('../types');
          const res = createRes();
          const next = createNext();
          const updatedUser = { id: 'updated' };
          const mockUser = {
            credentials: { expiresAt: moment().add(10, 's') },
            refreshCredentials: jest.fn().mockResolvedValue(updatedUser),
          };

          User.fromExpress.mockReturnValue(mockUser);

          const req: any = { isAuthenticated: () => true, user: { id: 'orig' } };

          ensureAuthenticated(req, res, next);

          setImmediate(() => {
            expect(mockUser.refreshCredentials).toHaveBeenCalled();
            expect(req.user).toBe(updatedUser);
            expect(next).toHaveBeenCalled();
            resolve();
          });
        });
      });
    });

    it('skips refresh when credentials are valid', () => {
      jest.doMock('../types', () => ({ User: { fromExpress: jest.fn() } }));
      jest.doMock('../config', () => ({ URI: false }));

      jest.isolateModules(() => {
        const { ensureAuthenticated } = require('../handlers/customMiddleware');
        const { User } = require('../types');
        const res = createRes();
        const next = createNext();
        const mockUser = {
          credentials: { expiresAt: moment().add(2, 'm') },
          refreshCredentials: jest.fn(),
        };

        User.fromExpress.mockReturnValue(mockUser);

        const req: any = { isAuthenticated: () => true, user: { id: 'orig' } };

        ensureAuthenticated(req, res, next);

        expect(mockUser.refreshCredentials).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalled();
      });
    });
  });

  describe('reroute', () => {
    it('redirects when URI host differs', () => {
      jest.doMock('../types', () => ({ User: {} }));
      jest.doMock('../config', () => ({ URI: 'https://example.com' }));

      jest.isolateModules(() => {
        const { reroute } = require('../handlers/customMiddleware');
        const res = createRes();
        const next = createNext();
        const req: any = {
          protocol: 'http',
          get: () => 'localhost:3000',
          originalUrl: '/foo?x=1#y',
        };

        reroute(req, res, next);

        expect(res.redirect).toHaveBeenCalledWith('https://example.com/foo?x=1#y');
        expect(next).not.toHaveBeenCalled();
      });
    });

    it('calls next when URI host matches', () => {
      jest.doMock('../types', () => ({ User: {} }));
      jest.doMock('../config', () => ({ URI: 'https://localhost:3000' }));

      jest.isolateModules(() => {
        const { reroute } = require('../handlers/customMiddleware');
        const res = createRes();
        const next = createNext();
        const req: any = {
          protocol: 'https',
          get: () => 'localhost:3000',
          originalUrl: '/foo',
        };

        reroute(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.redirect).not.toHaveBeenCalled();
      });
    });
  });
});
