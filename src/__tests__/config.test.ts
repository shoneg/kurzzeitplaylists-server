import {
  CLIENT_ID,
  CLIENT_SECRET,
  DB_HOST,
  DB_NAME,
  DB_PASSWORD,
  DB_PORT,
  DB_USER,
  HOST,
  NEXTCLOUD_CLIENT_ID,
  NEXTCLOUD_CLIENT_SECRET,
  NEXTCLOUD_URL,
  PORT,
  RUNNING_WITH_TLS,
  SESSION_SECRET,
  SESSION_TIMEOUT,
  URI,
} from '../config';

test('all env variables should be initialized', () => {
  expect(CLIENT_ID).toBeDefined();
  expect(CLIENT_SECRET).toBeDefined();
  expect(DB_HOST).toBeDefined();
  expect(DB_NAME).toBeDefined();
  expect(DB_PASSWORD).toBeDefined();
  expect(DB_PORT).toBeDefined();
  expect(DB_USER).toBeDefined();
  expect(HOST).toBeDefined();
  expect(NEXTCLOUD_CLIENT_ID).toBeDefined();
  expect(NEXTCLOUD_CLIENT_SECRET).toBeDefined();
  expect(NEXTCLOUD_URL).toBeDefined();
  expect(PORT).toBeDefined();
  expect(RUNNING_WITH_TLS).toBeDefined();
  expect(SESSION_SECRET).toBeDefined();
  expect(SESSION_TIMEOUT).toBeDefined();
  expect(URI).toBeDefined();
});
