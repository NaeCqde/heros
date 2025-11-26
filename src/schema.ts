import type { InferSelectModel } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const eros = sqliteTable('eros', {
    thumbnail: text().notNull().primaryKey(),
    src: text().notNull(),
    timestamp: integer({ mode: 'timestamp' }),
});

export const monsnodes = sqliteTable('monsnodes', {
    src: text().notNull().primaryKey(),
    thumbnail: text().notNull(),
});

export const pendings = sqliteTable('pendings', {
    src: text().notNull().primaryKey(),
    thumbnail: text().notNull(),
});

export type Eros = InferSelectModel<typeof eros>;
export type Monsnode = InferSelectModel<typeof monsnodes>;
export type Pendings = InferSelectModel<typeof pendings>;
