import { Pool, QueryResult, PoolConfig } from 'pg';

// Configuracion del pool de conexiones
const poolConfig: PoolConfig = {
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
        // SSL habilitado - Railway requiere SSL pero sin validar certificado estrictamente
        ssl: { rejectUnauthorized: false }
      }
    : {
        ...poolConfig,
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD
      }
);

// Log de errores del pool (no crashea la app)
pool.on('error', (err: Error) => {
  console.error('[DB POOL] Unexpected error on idle client:', err.message);
});

// Función query con tipos
const query = (text: string, params?: unknown[]): Promise<QueryResult> => {
  return pool.query(text, params);
};

export { query, pool };
export default { query, pool };
