// One-off: update the two counselor profiles with real qualifications and WhatsApp numbers.
const { db } = require('../lib/db');

const updates = [
  {
    slug: 'okegbemi-eniolaye-aishat',
    qualifications: 'B.Sc. Biochemistry · Diploma in Nursing Assistant · M.Sc. Public Health',
    whatsapp: '+2347062789867',
  },
  {
    slug: 'okegbemi-sunday-olakunle',
    qualifications: 'B.Tech. Statistics · M.Sc. Information Technology',
    whatsapp: '+2347035672890',
  },
];

const stmt = db.prepare('UPDATE counselors SET qualifications = ?, whatsapp = ? WHERE slug = ?');
for (const u of updates) {
  const info = stmt.run(u.qualifications, u.whatsapp, u.slug);
  console.log(`${u.slug}: ${info.changes} row(s) updated`);
}

for (const row of db.prepare('SELECT slug,name,qualifications,whatsapp FROM counselors ORDER BY position').all()) {
  console.log(row);
}
