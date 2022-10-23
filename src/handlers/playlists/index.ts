import { Router } from "express";
import { editPlaylistView, playlistsView } from "./service";

const playlistRouter = Router();

playlistRouter.get('/', playlistsView)
playlistRouter.get('/:id', editPlaylistView)

export default playlistRouter;