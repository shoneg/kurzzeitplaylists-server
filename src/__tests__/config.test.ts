import { CLIENT_ID, CLIENT_SECRET, HOST, PORT, SESSION_SECRET } from '../config';

test('all env variables should be initialized', () => {
  expect(SESSION_SECRET).toBeDefined();
  expect(CLIENT_ID).toBeDefined();
  expect(CLIENT_SECRET).toBeDefined();
  expect(HOST).toBeDefined();
  expect(PORT).toBeDefined();
});
