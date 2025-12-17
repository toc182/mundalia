const { Pool } = require('pg');

// Configuracion del pool de conexiones
const poolConfig = {
  // Limites de conexiones
  max: 20,                      // Maximo 20 conexiones simultaneas
  idleTimeoutMillis: 30000,     // Cerrar conexiones inactivas despues de 30s
  connectionTimeoutMillis: 5000, // Timeout si no puede conectar en 5s
};

// Si existe DATABASE_URL (produccion/Railway), usarla
// Si no, usar variables individuales (desarrollo/local)
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        ...poolConfig,
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      }
    : {
        ...poolConfig,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD
      }
);

// Log de errores del pool (no crashea la app)
pool.on('error', (err) => {
  console.error('[DB POOL] Unexpected error on idle client:', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
