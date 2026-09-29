import { drizzle } from 'drizzle-orm/node-postgres';
import { pgTable, text, serial, customType } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';

// Custom type for pgvector
const customVector = customType<{ data: number[] }>({
  dataType() { return 'vector(3)'; },
  toDriver(value) { return JSON.stringify(value); },
  fromDriver(value) { return typeof value === 'string' ? JSON.parse(value) : value; },
});

// Table definition
const memoryItems = pgTable('memory_items', {
  id: serial('id').primaryKey(),
  content: text('content').notNull(),
  embedding: customVector('embedding'),
  searchVector: customType<{ data: any }>({
    dataType() { return 'tsvector'; }
  })('search_vector')
});

async function main() {
  // We use a dummy pool just to generate SQL since we don't have a local PG server running
  const pool = new Pool({});
  const db = drizzle(pool);

  console.log('--- Generated Schema (via drizzle-kit usually) ---');
  console.log(`CREATE TABLE memory_items (id SERIAL PRIMARY KEY, content TEXT NOT NULL, embedding vector(3), search_vector tsvector);`);

  console.log('\n--- Insert Query ---');
  const insertQuery = db.insert(memoryItems).values([
    { content: 'OAuth settings', embedding: [0.1, 0.2, 0.8] }
  ]).toSQL();
  console.log(insertQuery);

  console.log('\n--- Vector Similarity Query ---');
  const targetEmbedding = [0.1, 0.2, 0.8];
  const similarityQuery = db.select({
    id: memoryItems.id,
    content: memoryItems.content,
    distance: sql<number>`${memoryItems.embedding} <=> ${JSON.stringify(targetEmbedding)}::vector`
  })
  .from(memoryItems)
  .orderBy(sql`${memoryItems.embedding} <=> ${JSON.stringify(targetEmbedding)}::vector`)
  .limit(2).toSQL();
  console.log(similarityQuery);

  console.log('\n--- Combined Hybrid Query (Vector + Full-Text) ---');
  const searchQuery = 'OAuth';
  const hybridQuery = db.select({
    id: memoryItems.id,
    content: memoryItems.content,
    vectorDistance: sql<number>`${memoryItems.embedding} <=> ${JSON.stringify(targetEmbedding)}::vector`,
    textRank: sql<number>`ts_rank(${memoryItems.searchVector}, plainto_tsquery('english', ${searchQuery}))`
  })
  .from(memoryItems)
  .where(sql`${memoryItems.searchVector} @@ plainto_tsquery('english', ${searchQuery})`)
  .orderBy(
    sql`(${memoryItems.embedding} <=> ${JSON.stringify(targetEmbedding)}::vector) - ts_rank(${memoryItems.searchVector}, plainto_tsquery('english', ${searchQuery}))`
  ).toSQL();
  console.log(hybridQuery);

  process.exit(0);
}

main().catch(console.error);
