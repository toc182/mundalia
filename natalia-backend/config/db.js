const { Pool } = require('pg');

// Si existe DATABASE_URL (produccion/Railway), usarla
// Si no, usar variables individuales (desarrollo/local)
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      }
    : {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD
      }
);

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
