// Synthetic child process only. No real account, environment or warehouse access.
const path = require('node:path');
const { createSession } = require(path.resolve(__dirname, '../../src/sessionAuth.ts'));
let warehouseRequests = 0;
globalThis.fetch = async (input) => {
  const url = new URL(String(input));
  if (url.origin !== 'https://warehouse.fixture.invalid') {
    throw new Error('HTTP fixture forbids outgoing network');
  }
  warehouseRequests++;
  return new Response(JSON.stringify({ error_code: 'FIXTURE_UPSTREAM_FAILURE', message: 'Synthetic unavailable warehouse' }), { status: 503 });
};
const tokens = {};
for (const role of ['admin', 'viewer', 'reset']) {
  tokens[role] = createSession({
    account_id: 101, username: 'synthetic-' + role, email: 'fixture@example.invalid',
    role: role === 'reset' ? 'admin' : role, password_reset_required: role === 'reset',
  }).access_token;
}
process.send({ type: 'tokens', tokens });
process.on('message', (message) => {
  if (message?.type === 'counts') process.send({ type: 'counts', warehouseRequests });
});
require(path.resolve(__dirname, '../../src/server.ts'));
