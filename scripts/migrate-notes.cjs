// This database predates the migration ledger. Apply only the additive Notes migration.
require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('node:fs');
(async () => {
  const sql = neon(process.env.DATABASE_URL);
  const [state] = await sql("SELECT to_regclass('public.notes') AS notes", []);
  if (state.notes) { console.log('Notes table already exists.'); return; }
  const statements = fs.readFileSync('drizzle/0001_woozy_titania.sql', 'utf8').split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);
  await sql.transaction(statements.map(statement => sql(statement, [])));
  console.log('Notes table and index created. Existing tables unchanged.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
