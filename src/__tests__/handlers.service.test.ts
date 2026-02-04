import { createRes, createNext } from '../testUtils';

describe('handlers/service', () => {
  it('falsePathErrorView renders notFound with path', () => {
    const { falsePathErrorView } = require('../handlers/service');
    const res = createRes();
    const next = createNext();
    const req: any = { originalUrl: '/missing' };

    falsePathErrorView(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.render).toHaveBeenCalledWith('notFound', { path: '/missing' });
  });
});
