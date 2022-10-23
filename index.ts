import { HOST, PORT } from './src/config';
import { initPassport } from './src/passport';
import consolidate from 'consolidate';
import express from 'express';
import rootRouter from './src/handlers';
import Logger, { DEBUG } from './src/utils/logger';
import { defaultErrorHandler } from './src/handlers/errorHandlers';

const logger = new Logger(DEBUG.INFO, 'index');

// Initialize the express engine
export const app: express.Application = express();

// configure Express
app.set('views', __dirname + '/src/views');
app.set('view engine', 'html');

initPassport();

app.engine('html', consolidate.nunjucks);

app.use('', rootRouter);

app.use(defaultErrorHandler);

// Server setup
app.listen(PORT, 'localhost', 100, () => {
  logger.info(`Kurzzeitplaylistserver is running on http://${HOST}:${PORT}/`);
});
