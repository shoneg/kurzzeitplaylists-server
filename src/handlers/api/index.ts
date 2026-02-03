import { Router } from 'express';
import { ensureAuthenticated } from '../customMiddleware';
import {
  deleteAccount,
  playlistDetail,
  playlists,
  recognize,
  session,
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
apiRouter.post('/auth/delete', ensureAuthenticated, deleteAccount);

export default apiRouter;
