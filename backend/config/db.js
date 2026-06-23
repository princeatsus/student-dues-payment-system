const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('Connection string used:', process.env.DATABASE_URL);
  } else {
    console.log('✅ Connected to Supabase PostgreSQL successfully!');
    release();
  }
});

module.exports = pool;