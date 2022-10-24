import { Router } from 'express';
import { editPlaylistView, playlistsView, recognize } from './service';

const playlistRouter = Router();

playlistRouter.get('/', playlistsView);
playlistRouter.get('/recognize', recognize)
playlistRouter.get('/:id', editPlaylistView);

export default playlistRouter;
