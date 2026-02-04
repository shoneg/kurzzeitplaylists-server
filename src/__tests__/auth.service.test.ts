import { createRes, createNext } from '../testUtils';

jest.mock('../types', () => ({ User: { fromExpress: jest.fn() } }));

describe('auth/service', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('authView redirects when already logged in', () => {
    jest.isolateModules(() => {
      const { authView } = require('../handlers/auth/service');
      const res = createRes();
      const req: any = { user: { id: 'u1' } };

      authView(req, res);

      expect(res.redirect).toHaveBeenCalledWith('..');
    });
  });

  it('authView renders login page when not logged in', () => {
    jest.isolateModules(() => {
      const { authView } = require('../handlers/auth/service');
      const res = createRes();
      const req: any = { user: undefined };

      authView(req, res);

      expect(res.render).toHaveBeenCalledWith('login.html');
    });
  });

  it('deleteView renders delete page', () => {
    jest.isolateModules(() => {
      const { deleteView } = require('../handlers/auth/service');
      const res = createRes();

      deleteView({} as any, res);

      expect(res.render).toHaveBeenCalledWith('delete.html');
    });
  });

  it('deleteAccount rejects incorrect confirmation', () => {
    jest.doMock('../db', () => ({ __esModule: true, default: { getInstance: jest.fn() } }));

    jest.isolateModules(() => {
      const { deleteAccount } = require('../handlers/auth/service');
      const res = createRes();
      const next = createNext();
      const req: any = { body: { sure: 'nope' } };

      deleteAccount(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith('Incorrect confirmation phrase');
    });
  });

  it('deleteAccount deletes user and logs out on success', async () => {
    const deleteFn = jest.fn().mockResolvedValue(undefined);
    const getInstance = jest.fn().mockReturnValue({ user: { delete: deleteFn } });

    jest.doMock('../db', () => ({ __esModule: true, default: { getInstance } }));

    await new Promise<void>((resolve) => {
      jest.isolateModules(() => {
        const { deleteAccount } = require('../handlers/auth/service');
        const { User } = require('../types');
        const res = createRes();
        const next = createNext();
        const req: any = {
          body: { sure: "Yes, I'm sure!" },
          user: { id: 'u1' },
          logout: (cb: (err?: Error) => void) => cb(),
        };

        User.fromExpress.mockReturnValue({ id: 'u1' });

        deleteAccount(req, res, next);

        setImmediate(() => {
          expect(deleteFn).toHaveBeenCalled();
          expect(res.redirect).toHaveBeenCalledWith('/');
          resolve();
        });
      });
    });
  });
});
