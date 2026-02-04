import { defaultErrorHandler } from './src/handlers/errorHandlers';
import { CLIENT_APP_URL, HOST, PORT, RUNNING_WITH_TLS } from './src/config';
import { initPassport } from './src/passport';
import consolidate from 'consolidate';
import express from 'express';
import Logger, { DEBUG } from './src/utils/logger';
import rootRouter from './src/handlers';
import DB from './src/db';
import { QueryError } from 'mysql2';
import cron from './src/cron';
import { User } from './src/types';

const logger = new Logger(DEBUG.INFO, 'index');

// Initialize the express engine
export const app: express.Application = express();

// init db
const db = DB.getInstance();
db.crateDbIfNotExist()
  .then(() => {
    logger.info('db creation done');
  })
  .catch((err: QueryError) => {
    if (err.fatal) {
      logger.error('Got fatal error while creating db:', err.message);
      throw Error(err.name + '\n' + err.stack);
    } else {
      logger.warn(`Got error (${err.name}) while creating db:`, err.message);
    }
  });
db.testConnection().then((suc) => {
  if (suc) {
    logger.info('db connection test was successful');
  } else {
    logger.error("db connection test wasn't successful");
  }
});

// configure Express
app.set('views', __dirname + '/src/views');
app.set('view engine', 'html');

// reverse proxy
app.set('trust proxy', 1)

initPassport();
User.startWaitingForCleanup();

app.engine('html', consolidate.nunjucks);

// CORS for client <-> API with cookies
app.use((req, res, next) => {
  if (CLIENT_APP_URL) {
    res.header('Access-Control-Allow-Origin', CLIENT_APP_URL);
    res.header('Vary', 'Origin');
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, X-Requested-With');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use('', rootRouter);

app.use(defaultErrorHandler);


cron();

// Server setup
app.listen(PORT, '0.0.0.0', 100, () => {
  logger.info(`Kurzzeitplaylistserver is running on ${RUNNING_WITH_TLS ? 'https' : 'http'}://${HOST}:${PORT}/`);
});
