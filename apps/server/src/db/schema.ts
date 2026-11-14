/**
 * Datenbankschema (Auszug für Phase 3/4 – Firmen, Nutzer, Anmeldung, Mail-/KI-Konfiguration, Audit).
 * Phase 5: Assessments, Abteilungsantworten, Zusammenführung, Quellen, Kommentare, Änderungshistorie.
 * Benchmark und Empfehlungen folgen in Phase 6/7.
 * Siehe docs/04_architektur/02_datenmodell.md.
 */
import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
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

// ─── Phase 5: Erfassung ────────────────────────────────────────────────────────

export const assessmentStatusEnum = pgEnum('assessment_status', ['collecting', 'consolidating', 'released']);
export const methodModelEnum = pgEnum('method_model', ['classic', 'agile']);
/** Gespeicherte Antworten; „offen“ = keine Zeile. */
export const answerValueEnum = pgEnum('answer_value', ['yes', 'partial', 'no', 'na']);

/** Assessment mit Stammdaten wie im Excel-Blatt „Information“ (FA-1.1). */
export const assessments = pgTable(
  'assessment',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    project: text('project').notNull(),
    assessorName: text('assessor_name').notNull(),
    domain: text('domain').notNull().default(''),
    organizationUnit: text('organization_unit').notNull().default(''),
    mainStakeholder: text('main_stakeholder').notNull().default(''),
    contact: text('contact').notNull().default(''),
    assessmentType: text('assessment_type').notNull().default(''),
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),
    interviewCount: integer('interview_count'),
    scope: text('scope').notNull().default(''),
    methodModel: methodModelEnum('method_model').notNull().default('agile'),
    includeAi: boolean('include_ai').notNull().default(true),
    catalogVersion: text('catalog_version').notNull(),
    status: assessmentStatusEnum('status').notNull().default('collecting'),
    releasedAt: timestamp('released_at', { withTimezone: true }),
    createdByUserId: uuid('created_by_user_id').references(() => users.id),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('assessment_company_idx').on(t.companyId, t.createdAt)],
);

/** Nutzer, die am Assessment mitarbeiten; die Rechte ergeben sich aus der Rolle. */
export const assessmentMembers = pgTable(
  'assessment_member',
  {
    assessmentId: uuid('assessment_id')
      .notNull()
      .references(() => assessments.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.assessmentId, t.userId] })],
);

/** Kernbereich → Abteilung; ein Kernbereich kann mehreren Abteilungen zugewiesen sein (parallele Erfassung). */
export const keyAreaAssignments = pgTable(
  'key_area_assignment',
  {
    assessmentId: uuid('assessment_id')
      .notNull()
      .references(() => assessments.id, { onDelete: 'cascade' }),
    keyAreaId: text('key_area_id').notNull(),
    departmentId: uuid('department_id')
      .notNull()
      .references(() => departments.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.assessmentId, t.keyAreaId, t.departmentId] })],
);

/** Antwort einer Abteilung je Kontrollpunkt; `version` für optimistisches Sperren (409 bei Konflikt). */
export const departmentAnswers = pgTable(
  'department_answer',
  {
    assessmentId: uuid('assessment_id')
      .notNull()
      .references(() => assessments.id, { onDelete: 'cascade' }),
    departmentId: uuid('department_id')
      .notNull()
      .references(() => departments.id, { onDelete: 'cascade' }),
    checkpointId: text('checkpoint_id').notNull(),
    value: answerValueEnum('value').notNull(),
    version: integer('version').notNull().default(1),
    updatedByUserId: uuid('updated_by_user_id').references(() => users.id),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.assessmentId, t.departmentId, t.checkpointId] })],
);

/** Abgabe einer Abteilung (Status „abgegeben“); danach sind ihre Antworten gesperrt, bis der Assessor sie wieder öffnet. */
export const departmentSubmissions = pgTable(
  'department_submission',
  {
    assessmentId: uuid('assessment_id')
      .notNull()
      .references(() => assessments.id, { onDelete: 'cascade' }),
    departmentId: uuid('department_id')
      .notNull()
      .references(() => departments.id, { onDelete: 'cascade' }),
    submittedByUserId: uuid('submitted_by_user_id').references(() => users.id),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.assessmentId, t.departmentId] })],
);

/** Vom Assessor festgelegte Antwort je Kontrollpunkt – einzige Grundlage für Bericht, Benchmark und Empfehlungen. */
export const consolidatedAnswers = pgTable(
  'consolidated_answer',
  {
    assessmentId: uuid('assessment_id')
      .notNull()
      .references(() => assessments.id, { onDelete: 'cascade' }),
    checkpointId: text('checkpoint_id').notNull(),
    value: answerValueEnum('value').notNull(),
    suggestedValue: text('suggested_value').notNull(),
    rationale: text('rationale'),
    version: integer('version').notNull().default(1),
    consolidatedByUserId: uuid('consolidated_by_user_id').references(() => users.id),
    consolidatedAt: timestamp('consolidated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.assessmentId, t.checkpointId] })],
);

/** Quellen bzw. Autoren der Informationen (US-3.2), je Assessment gepflegt. */
export const sources = pgTable(
  'source',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assessmentId: uuid('assessment_id')
      .notNull()
      .references(() => assessments.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    role: text('role').notNull().default(''),
    unit: text('unit').notNull().default(''),
    type: text('type').notNull().default('person'),
    active: boolean('active').notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('source_assessment_name_role_uq').on(
      t.assessmentId,
      sql`lower(${t.name})`,
      sql`lower(${t.role})`,
    ),
  ],
);

/** Kommentare zu Kontrollpunkten; Verfasser wird automatisch gesetzt (US-3.1). */
export const comments = pgTable(
  'comment',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assessmentId: uuid('assessment_id')
      .notNull()
      .references(() => assessments.id, { onDelete: 'cascade' }),
    checkpointId: text('checkpoint_id').notNull(),
    departmentId: uuid('department_id').references(() => departments.id, { onDelete: 'set null' }),
    authorUserId: uuid('author_user_id')
      .notNull()
      .references(() => users.id),
    sourceId: uuid('source_id').references(() => sources.id),
    text: text('text').notNull(),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (t) => [index('comment_assessment_cp_idx').on(t.assessmentId, t.checkpointId)],
);

/**
 * Änderungshistorie (N-03): append-only. Ein Datenbank-Trigger verhindert UPDATE und DELETE
 * (Migration 0003). Kein Fremdschlüssel auf das Assessment, damit die Historie ein Löschen überdauert.
 */
export const changeHistory = pgTable(
  'change_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id').notNull(),
    assessmentId: uuid('assessment_id'),
    assessmentName: text('assessment_name'),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id'),
    keyAreaId: text('key_area_id'),
    checkpointId: text('checkpoint_id'),
    action: text('action').notNull(),
    oldValue: text('old_value'),
    newValue: text('new_value'),
    rationale: text('rationale'),
    userId: uuid('user_id'),
    userNameSnapshot: text('user_name_snapshot').notNull(),
    userRoleSnapshot: text('user_role_snapshot').notNull(),
    departmentId: uuid('department_id'),
    departmentSnapshot: text('department_snapshot'),
    createdAt: createdAt(),
  },
  (t) => [
    index('change_history_company_idx').on(t.companyId, t.createdAt),
    index('change_history_assessment_idx').on(t.assessmentId, t.checkpointId, t.createdAt),
  ],
);

// ─── Phase 6: Auswertung ───────────────────────────────────────────────────────

/**
 * Ergebnis-Schnappschuss eines **freigegebenen** Assessments für den Benchmark (08_mandanten-und-benchmark.md, 3.1).
 * Entsteht bei der Freigabe und wird beim Zurücknehmen der Freigabe gelöscht. Enthält nur Kennzahlen je
 * Kernbereich – keine Antworten, Kommentare oder Namen.
 */
export const assessmentScores = pgTable(
  'assessment_score',
  {
    assessmentId: uuid('assessment_id')
      .primaryKey()
      .references(() => assessments.id, { onDelete: 'cascade' }),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    catalogVersion: text('catalog_version').notNull(),
    releasedAt: timestamp('released_at', { withTimezone: true }).notNull(),
    overallIndex: real('overall_index'),
    aiIndex: real('ai_index'),
    /** [{ keyAreaId, fulfillment, level }] */
    areas: jsonb('areas').notNull(),
  },
  (t) => [index('assessment_score_company_idx').on(t.companyId, t.releasedAt)],
);
