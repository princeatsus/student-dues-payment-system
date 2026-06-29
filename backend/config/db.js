const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.connect(async (err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('Connection string used:', process.env.DATABASE_URL);
  } else {
    console.log('✅ Connected to Supabase PostgreSQL successfully!');
    
    // Auto-run schema migrations if the students table does not exist
    try {
      const checkTable = await client.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'students')"
      );
      
      if (!checkTable.rows[0].exists) {
        console.log('⚙️ First-time setup: Initializing database schema from schema.sql...');
        const schemaPath = path.join(__dirname, 'schema.sql');
        if (fs.existsSync(schemaPath)) {
          const sql = fs.readFileSync(schemaPath, 'utf8');
          await client.query(sql);
          console.log('✅ Database schema initialized successfully!');
        } else {
          console.warn('⚠️ schema.sql file not found at:', schemaPath);
        }
      } else {
        console.log('🛡️ Database tables verified.');
      }
    } catch (dbErr) {
      console.error('❌ Error during database auto-migration:', dbErr.message);
    } finally {
      release();
    }
  }
});

module.exports = pool;