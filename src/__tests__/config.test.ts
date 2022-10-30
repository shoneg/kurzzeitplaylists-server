import {
  CLIENT_ID,
  CLIENT_SECRET,
  DB_HOST,
  DB_NAME,
  DB_PASSWORD,
  DB_PORT,
  DB_USER,
  HOST,
  PORT,
  SECURE_COOKIES_ONLY,
  SESSION_SECRET,
  SESSION_TIMEOUT,
} from '../config';

test('all env variables should be initialized', () => {
  expect(CLIENT_ID).toBeDefined();
  expect(CLIENT_SECRET).toBeDefined();
  expect(DB_HOST).toBeDefined();
  expect(DB_NAME).toBeDefined();
  expect(DB_PASSWORD).toBeDefined();
  expect(DB_USER).toBeDefined();
  expect(DB_PORT).toBeDefined();
  expect(HOST).toBeDefined();
  expect(PORT).toBeDefined();
  expect(SECURE_COOKIES_ONLY).toBeDefined();
  expect(SESSION_SECRET).toBeDefined();
  expect(SESSION_TIMEOUT).toBeDefined();
});
