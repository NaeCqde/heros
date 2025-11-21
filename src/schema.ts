import type { InferSelectModel } from 'drizzle-orm';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const eros = sqliteTable('eros', {
    src: text().notNull().primaryKey(),
    thumbnail: text().notNull(),
});

export const monsnode = sqliteTable('monsnode', {
    src: text().notNull().primaryKey(),
    thumbnail: text().notNull(),
});

export const pendings = sqliteTable('pendings', {
    src: text().notNull().primaryKey(),
    thumbnail: text().notNull(),
});

export type Eros = InferSelectModel<typeof eros>;
export type Monsnode = InferSelectModel<typeof monsnode>;
export type Pendings = InferSelectModel<typeof pendings>;
