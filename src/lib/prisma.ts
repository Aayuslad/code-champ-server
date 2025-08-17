import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";

// Global variable to store PrismaClient instance
declare global {
    var __prisma: PrismaClient | undefined;
}

// Create PrismaClient instance optimized for Vercel serverless
export const prisma = globalThis.__prisma || new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
    // Connection pooling configuration for serverless
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
}).$extends(withAccelerate());

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') {
    globalThis.__prisma = prisma;
}

// Graceful shutdown function
export async function disconnectPrisma() {
    try {
        await prisma.$disconnect();
        console.log('Prisma client disconnected successfully');
    } catch (error) {
        console.error('Error disconnecting Prisma client:', error);
    }
}

// Handle process termination (less critical for serverless)
if (process.env.NODE_ENV !== 'production') {
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
}
