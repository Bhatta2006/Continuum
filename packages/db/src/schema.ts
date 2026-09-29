import { pgTable, text, serial, timestamp, uuid, customType, pgEnum } from 'drizzle-orm/pg-core';

export const customVector = customType<{ data: number[] }>({
  dataType() { return 'vector(1536)'; },
  toDriver(value) { return JSON.stringify(value); },
  fromDriver(value) { return typeof value === 'string' ? JSON.parse(value) : value; },
});

export const roleEnum = pgEnum('role', ['owner', 'admin', 'editor', 'viewer', 'agent']);
export const scopeEnum = pgEnum('scope', ['private', 'project', 'team', 'org']);
export const memoryTypeEnum = pgEnum('memory_type', ['decision', 'convention', 'architecture', 'constraint', 'preference', 'task_state', 'learning', 'glossary', 'open_question', 'risk']);

export const workspaces = pgTable('workspaces', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const identities = pgTable('identities', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const toolAccounts = pgTable('tool_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  identityId: uuid('identity_id').notNull().references(() => identities.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(), // e.g. 'claude_code', 'chatgpt'
  accountId: text('account_id').notNull(), // Provider-specific ID
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const workspaceMembers = pgTable('workspace_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  identityId: uuid('identity_id').notNull().references(() => identities.id, { onDelete: 'cascade' }),
  role: roleEnum('role').notNull().default('viewer'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const memoryItems = pgTable('memory_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  type: memoryTypeEnum('type').notNull(),
  scope: scopeEnum('scope').notNull().default('project'),
  content: text('content').notNull(),
  embedding: customVector('embedding'),
  authorId: uuid('author_id').references(() => identities.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  // For hybrid search (stubbed as text for now, can be modified via raw SQL for TSVECTOR)
  searchVector: customType<{ data: any }>({ dataType() { return 'tsvector'; } })('search_vector')
});
