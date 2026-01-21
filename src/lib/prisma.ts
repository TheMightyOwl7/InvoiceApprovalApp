import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';
import { join } from 'path';

// The database file is in the root dev.db (created by Prisma CLI)
const dbPath = join(process.cwd(), 'dev.db');

// Create Prisma adapter for SQLite
const adapter = new PrismaBetterSqlite3({
    url: `file:${dbPath}`,
});

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
