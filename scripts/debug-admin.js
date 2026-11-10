'use strict';
process.env.DB_FILE = require('node:path').join(__dirname, '..', 'data', 'test-e2e.db');
const { db } = require('../lib/db');
const { hashPassword } = require('../lib/auth');
const { createSession } = require('../lib/auth');
let admin = db.prepare('SELECT * FROM admins LIMIT 1').get();
if (!admin) {
  db.prepare('INSERT INTO admins (name,email,password_hash,role) VALUES (?,?,?,?)')
    .run('Test Admin', 'admin@test.local', hashPassword('correct-horse-battery'), 'admin');
  admin = db.prepare('SELECT * FROM admins LIMIT 1').get();
}
const s = createSession(admin.id);
const { server } = require('../server');
server.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  const res = await fetch(`http://127.0.0.1:${port}/admin`, { headers: { Cookie: `asl_session=${s.id}` } });
  const text = await res.text();
  console.log('status', res.status);
  if (res.status !== 200) console.log(text.slice(0, 3000));
  else console.log('ok', text.length);
  server.close();
  process.exit(0);
});
