import { PrismaClient } from "@prisma/client";
import logger from "./logger";

// Global variable to store PrismaClient instance
declare global {
    var __prisma: PrismaClient | undefined;
}

// Create PrismaClient instance with connection pooling configuration
export const prisma = globalThis.__prisma || new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
    // Connection pooling configuration
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
});

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') {
    globalThis.__prisma = prisma;
}

// Graceful shutdown function
export async function disconnectPrisma() {
    try {
        await prisma.$disconnect();
        logger.info('Prisma client disconnected successfully');
    } catch (error) {
        logger.error('Error disconnecting Prisma client:', error);
    }
}

// Handle process termination
process.on('beforeExit', async () => {
    await disconnectPrisma();
});

process.on('SIGINT', async () => {
    await disconnectPrisma();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await disconnectPrisma();
    process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', async (error) => {
    console.error('Uncaught Exception:', error);
    await disconnectPrisma();
    process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    await disconnectPrisma();
    process.exit(1);
});
