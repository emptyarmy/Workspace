/**
 * Datenbankschema (Auszug für Phase 3/4 – Firmen, Nutzer, Anmeldung, Mail-/KI-Konfiguration, Audit).
 * Fachliche Tabellen (Assessments, Antworten, Zusammenführung, Historie, Benchmark) folgen in Phase 5/6.
 * Siehe docs/04_architektur/02_datenmodell.md.
 */
import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['admin', 'assessor', 'respondent', 'reader']);
export const userStatusEnum = pgEnum('user_status', ['invited', 'active', 'inactive', 'deleted']);
export const tokenPurposeEnum = pgEnum('token_purpose', ['password_set', 'email_change']);

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const industries = pgTable('industry', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  nameDe: text('name_de').notNull(),
  nameEn: text('name_en').notNull(),
  naceRef: text('nace_ref'),
  active: boolean('active').notNull().default(true),
});

export const companies = pgTable('company', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logoUrl: text('logo_url'),
  logoAlt: text('logo_alt'),
  industryId: uuid('industry_id').references(() => industries.id),
  benchmarkOptIn: boolean('benchmark_opt_in').notNull().default(true),
  active: boolean('active').notNull().default(true),
  createdByUserId: uuid('created_by_user_id'),
  createdAt: createdAt(),
});

export const companyDomains = pgTable(
  'company_domain',
  {
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    domain: text('domain').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.companyId, t.domain] }),
    uniqueIndex('company_domain_domain_uq').on(t.domain),
  ],
);

export const blockedDomains = pgTable('blocked_domain', {
  domain: text('domain').primaryKey(),
});

export const departments = pgTable(
  'department',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    active: boolean('active').notNull().default(true),
  },
  (t) => [uniqueIndex('department_company_name_uq').on(t.companyId, sql`lower(${t.name})`)],
);

export const users = pgTable(
  'app_user',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    departmentId: uuid('department_id').references(() => departments.id),
    name: text('name').notNull(),
    email: text('email').notNull(),
    role: roleEnum('role').notNull(),
    status: userStatusEnum('status').notNull().default('invited'),
    isExternal: boolean('is_external').notNull().default(false),
    passwordHash: text('password_hash'),
    mustChangePassword: boolean('must_change_password').notNull().default(false),
    failedLogins: integer('failed_logins').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdByUserId: uuid('created_by_user_id'),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('app_user_email_uq').on(sql`lower(${t.email})`)],
);

export const authIdentities = pgTable(
  'auth_identity',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(), // 'local' | 'oidc:<name>' – SSO-Vorbereitung
    externalId: text('external_id').notNull(),
  },
  (t) => [primaryKey({ columns: [t.provider, t.externalId] })],
);

export const oneTimeTokens = pgTable('one_time_token', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  purpose: tokenPurposeEnum('purpose').notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: createdAt(),
});

export const sessions = pgTable('session', {
  id: uuid('id').primaryKey().defaultRandom(),
  tokenHash: text('token_hash').notNull().unique(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: createdAt(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

export const setupState = pgTable('setup_state', {
  id: integer('id').primaryKey().default(1),
  initialized: boolean('initialized').notNull().default(false),
  initializedAt: timestamp('initialized_at', { withTimezone: true }),
  initializedFromIp: text('initialized_from_ip'),
});

/** Mailserver je Firma (S-04, N-05): „system“ = Standard der Installation (sendmail/SMTP aus .env). */
export const mailTransportEnum = pgEnum('mail_transport', ['system', 'smtp']);
export const companyMailConfig = pgTable('company_mail_config', {
  companyId: uuid('company_id')
    .primaryKey()
    .references(() => companies.id, { onDelete: 'cascade' }),
  transport: mailTransportEnum('transport').notNull().default('system'),
  host: text('host'),
  port: integer('port'),
  secure: boolean('secure').notNull().default(false),
  username: text('username'),
  /** AES-256-GCM-verschlüsselt (SECRET_ENCRYPTION_KEY), wird nie im Klartext ausgeliefert. */
  passwordEnc: text('password_enc'),
  fromAddress: text('from_address'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** KI-Module je Firma (S-04, S-09, ADR-004). */
export const aiModeEnum = pgEnum('ai_mode', ['rules', 'local', 'cloud']);
export const aiModules = pgTable(
  'ai_module',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    mode: aiModeEnum('mode').notNull(),
    provider: text('provider').notNull(),
    baseUrl: text('base_url'),
    model: text('model'),
    /** AES-256-GCM-verschlüsselt (SECRET_ENCRYPTION_KEY), wird nie im Klartext ausgeliefert. */
    apiKeyEnc: text('api_key_enc'),
    temperature: real('temperature').notNull().default(0.2),
    maxTokens: integer('max_tokens').notNull().default(2000),
    timeoutSec: integer('timeout_sec').notNull().default(60),
    sendComments: boolean('send_comments').notNull().default(false),
    pseudonymize: boolean('pseudonymize').notNull().default(true),
    promptTemplate: text('prompt_template'),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('ai_module_company_name_uq').on(t.companyId, sql`lower(${t.name})`)],
);

export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id'),
    companyId: uuid('company_id'),
    targetCompanyId: uuid('target_company_id'),
    action: text('action').notNull(),
    entity: text('entity'),
    entityId: text('entity_id'),
    details: jsonb('details'),
    ip: text('ip'),
    createdAt: createdAt(),
  },
  (t) => [
    index('audit_log_company_idx').on(t.companyId, t.createdAt),
    index('audit_log_target_company_idx').on(t.targetCompanyId, t.createdAt),
    index('audit_log_user_action_idx').on(t.userId, t.action, t.createdAt),
  ],
);
