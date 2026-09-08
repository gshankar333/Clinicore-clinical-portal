/**
 * Runs a .sql file against DATABASE_URL using the `pg` package —
 * an alternative to the `psql` CLI for anyone who doesn't have it
 * installed locally.
 *
 * Usage:
 *   node db/run-sql.js db/schema.sql
 *   node db/run-sql.js db/seed.sql
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node db/run-sql.js <path-to-sql-file>');
  process.exit(1);
}

const sql = fs.readFileSync(path.resolve(filePath), 'utf8');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false,
});

client
  .connect()
  .then(() => client.query(sql))
  .then(() => {
    console.log(`Applied ${filePath} successfully.`);
    return client.end();
  })
  .catch((err) => {
    console.error('Failed to run SQL file:', err.message);
    client.end();
    process.exit(1);
  });
