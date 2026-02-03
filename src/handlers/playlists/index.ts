import { Router } from 'express';
import { editPlaylistView, playlistsView, recognize, submitEditPlaylist } from './service';

/**
 * Server-rendered playlist views (legacy UI).
 */
const playlistRouter = Router();

playlistRouter.get('/', playlistsView);
playlistRouter.get('/recognize', recognize);
playlistRouter.get('/:id', editPlaylistView);
playlistRouter.post('/:id', submitEditPlaylist);

export default playlistRouter;
