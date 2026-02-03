import { RequestHandler } from 'express';

export const falsePathErrorView: RequestHandler = (req, res) => {
  res.status(404).render('notFound', { path: req.originalUrl });
};
