import { Router } from 'express';
import { editPlaylistView, playlistsView, recognize, submitEditPlaylist } from './service';

const playlistRouter = Router();

playlistRouter.get('/', playlistsView);
playlistRouter.get('/recognize', recognize);
playlistRouter.get('/:id', editPlaylistView);
playlistRouter.post('/:id', submitEditPlaylist);

export default playlistRouter;
