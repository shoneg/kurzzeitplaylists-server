import { Router } from 'express';
import { ensureAuthenticated } from '../customMiddleware';
import {
  aggregations,
  deleteAggregation,
  deleteAccount,
  playlistDetail,
  playlists,
  recognize,
  runAggregation,
  session,
  upsertAggregation,
  updatePlaylist,
} from './service';

/**
 * JSON API routes consumed by the client.
 */
const apiRouter = Router();

apiRouter.get('/session', session);
apiRouter.get('/playlists', ensureAuthenticated, playlists);
apiRouter.post('/playlists/recognize', ensureAuthenticated, recognize);
apiRouter.get('/playlists/:id', ensureAuthenticated, playlistDetail);
apiRouter.post('/playlists/:id', ensureAuthenticated, updatePlaylist);
apiRouter.get('/aggregations', ensureAuthenticated, aggregations);
apiRouter.post('/aggregations', ensureAuthenticated, upsertAggregation);
apiRouter.post('/aggregations/:targetId/run', ensureAuthenticated, runAggregation);
apiRouter.delete('/aggregations/:targetId', ensureAuthenticated, deleteAggregation);
apiRouter.post('/auth/delete', ensureAuthenticated, deleteAccount);

export default apiRouter;
