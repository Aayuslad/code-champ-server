export const databaseConfig = {
    // Connection pool settings
    pool: {
        min: 2,
        max: 10,
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200,
    },
    
    // Database connection settings
    connection: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'codechamp',
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    },
    
    // Prisma specific settings
    prisma: {
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        errorFormat: 'pretty' as const,
    }
};
