export const DOCUMENTS_SCHEMA_VERSION = "documents-v1";

export const DOCUMENTS_SCHEMA_OBJECTS = Object.freeze({
  tables: Object.freeze([
    "doc_issuer_profiles",
    "doc_signature_assets",
    "doc_client_profiles",
    "doc_sequences",
    "doc_documents",
    "doc_document_sources",
    "doc_document_events"
  ]),
  indexes: Object.freeze([
    "doc_registry_filters",
    "doc_registry_client",
    "doc_sources_by_ref"
  ]),
  triggers: Object.freeze([
    "doc_no_delete_issued",
    "doc_freeze_issued",
    "doc_status_transitions",
    "doc_events_no_update",
    "doc_events_no_delete"
  ])
});

function schemaDefinitions() {
  return [
    {
      type: "table",
      name: "doc_issuer_profiles",
      sql: `CREATE TABLE doc_issuer_profiles (
        id TEXT PRIMARY KEY,
        legal_name TEXT NOT NULL,
        id_type TEXT NOT NULL,
        id_number TEXT NOT NULL,
        vat_label TEXT NOT NULL,
        ciiu TEXT,
        phone TEXT,
        email TEXT,
        addresses_json TEXT NOT NULL,
        bank_json TEXT NOT NULL,
        brand_label TEXT,
        active_signature_id TEXT,
        active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`
    },
    {
      type: "table",
      name: "doc_signature_assets",
      sql: `CREATE TABLE doc_signature_assets (
        id TEXT PRIMARY KEY,
        issuer_id TEXT NOT NULL REFERENCES doc_issuer_profiles(id),
        r2_key TEXT NOT NULL UNIQUE,
        content_type TEXT NOT NULL CHECK (content_type IN ('image/png', 'image/svg+xml')),
        sha256 TEXT NOT NULL,
        width_px INTEGER,
        height_px INTEGER,
        created_at TEXT NOT NULL,
        retired_at TEXT
      )`
    },
    {
      type: "table",
      name: "doc_client_profiles",
      sql: `CREATE TABLE doc_client_profiles (
        id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        legal_name TEXT NOT NULL,
        tax_id_type TEXT,
        tax_id TEXT,
        billing_address TEXT,
        city TEXT,
        country TEXT,
        email TEXT,
        phone TEXT,
        contact_name TEXT,
        default_kind_id TEXT,
        default_currency TEXT CHECK (default_currency IS NULL OR default_currency IN ('COP', 'USD')),
        payment_terms_days INTEGER,
        po_policy TEXT NOT NULL DEFAULT 'none' CHECK (po_policy IN ('none', 'document', 'line', 'required')),
        show_bank_details INTEGER NOT NULL DEFAULT 0 CHECK (show_bank_details IN (0, 1)),
        finance_aliases_json TEXT NOT NULL DEFAULT '[]',
        notes TEXT,
        archived_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`
    },
    {
      type: "table",
      name: "doc_sequences",
      sql: `CREATE TABLE doc_sequences (
        series_key TEXT PRIMARY KEY,
        issuer_id TEXT NOT NULL,
        doc_type TEXT NOT NULL CHECK (doc_type IN ('cc', 'invoice', 'quote')),
        next_value INTEGER NOT NULL CHECK (next_value >= 1),
        display_pattern TEXT NOT NULL,
        is_test INTEGER NOT NULL DEFAULT 0 CHECK (is_test IN (0, 1)),
        bootstrapped_at TEXT,
        bootstrap_note TEXT,
        updated_at TEXT NOT NULL
      )`
    },
    {
      type: "table",
      name: "doc_documents",
      sql: `CREATE TABLE doc_documents (
        id TEXT PRIMARY KEY,
        kind_id TEXT NOT NULL,
        doc_type TEXT NOT NULL CHECK (doc_type IN ('cc', 'invoice', 'quote')),
        issuer_id TEXT NOT NULL REFERENCES doc_issuer_profiles(id),
        client_id TEXT REFERENCES doc_client_profiles(id),
        status TEXT NOT NULL CHECK (status IN ('draft', 'finalized', 'void')),
        origin TEXT NOT NULL DEFAULT 'system' CHECK (origin IN ('system', 'legacy_import')),
        series_key TEXT,
        number INTEGER,
        display_number TEXT,
        legacy_number TEXT,
        client_name TEXT NOT NULL DEFAULT '',
        client_tax_id TEXT NOT NULL DEFAULT '',
        project_label TEXT NOT NULL DEFAULT '',
        po_numbers TEXT NOT NULL DEFAULT '',
        currency TEXT NOT NULL CHECK (currency IN ('COP', 'USD')),
        total_minor INTEGER NOT NULL DEFAULT 0,
        issue_date TEXT,
        issue_year INTEGER,
        draft_json TEXT,
        draft_rev INTEGER NOT NULL DEFAULT 0,
        snapshot_json TEXT,
        snapshot_sha256 TEXT,
        template_version TEXT,
        supersedes_id TEXT REFERENCES doc_documents(id),
        superseded_by_id TEXT REFERENCES doc_documents(id),
        void_reason TEXT,
        voided_at TEXT,
        finalize_key TEXT UNIQUE,
        pdf_status TEXT NOT NULL DEFAULT 'none' CHECK (pdf_status IN ('none', 'pending', 'ready', 'failed')),
        pdf_r2_key TEXT,
        pdf_sha256 TEXT,
        html_r2_key TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        finalized_at TEXT,
        UNIQUE (series_key, number)
      )`
    },
    {
      type: "index",
      name: "doc_registry_filters",
      sql: `CREATE INDEX doc_registry_filters
        ON doc_documents(doc_type, issue_year, status, currency)`
    },
    {
      type: "index",
      name: "doc_registry_client",
      sql: `CREATE INDEX doc_registry_client
        ON doc_documents(client_id, issue_date)`
    },
    {
      type: "table",
      name: "doc_document_sources",
      sql: `CREATE TABLE doc_document_sources (
        document_id TEXT NOT NULL REFERENCES doc_documents(id) ON DELETE CASCADE,
        line_id TEXT NOT NULL DEFAULT '',
        source_system TEXT NOT NULL CHECK (source_system IN ('registro', 'rental_quote', 'document')),
        source_ref TEXT NOT NULL,
        observed_json TEXT NOT NULL,
        PRIMARY KEY (document_id, source_system, source_ref, line_id)
      )`
    },
    {
      type: "index",
      name: "doc_sources_by_ref",
      sql: `CREATE INDEX doc_sources_by_ref
        ON doc_document_sources(source_system, source_ref)`
    },
    {
      type: "table",
      name: "doc_document_events",
      sql: `CREATE TABLE doc_document_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id TEXT,
        event TEXT NOT NULL,
        actor_email TEXT NOT NULL,
        at TEXT NOT NULL,
        detail_json TEXT
      )`
    },
    {
      type: "trigger",
      name: "doc_no_delete_issued",
      sql: `CREATE TRIGGER doc_no_delete_issued
        BEFORE DELETE ON doc_documents
        WHEN OLD.status <> 'draft'
        BEGIN
          SELECT RAISE(ABORT, 'issued_documents_are_permanent');
        END`
    },
    {
      type: "trigger",
      name: "doc_freeze_issued",
      sql: `CREATE TRIGGER doc_freeze_issued
        BEFORE UPDATE OF
          kind_id, doc_type, issuer_id, client_id, origin, series_key, number,
          display_number, legacy_number, client_name, client_tax_id, project_label,
          po_numbers, currency, total_minor, issue_date, issue_year, draft_json,
          draft_rev, snapshot_json, snapshot_sha256, template_version,
          supersedes_id, finalize_key, finalized_at
        ON doc_documents
        WHEN OLD.status <> 'draft'
        BEGIN
          SELECT RAISE(ABORT, 'finalized_snapshot_is_immutable');
        END`
    },
    {
      type: "trigger",
      name: "doc_status_transitions",
      sql: `CREATE TRIGGER doc_status_transitions
        BEFORE UPDATE OF status ON doc_documents
        WHEN NOT (
          (OLD.status = 'draft' AND NEW.status IN ('draft', 'finalized')) OR
          (OLD.status = 'finalized' AND NEW.status IN ('finalized', 'void')) OR
          (OLD.status = 'void' AND NEW.status = 'void')
        )
        BEGIN
          SELECT RAISE(ABORT, 'invalid_status_transition');
        END`
    },
    {
      type: "trigger",
      name: "doc_events_no_update",
      sql: `CREATE TRIGGER doc_events_no_update
        BEFORE UPDATE ON doc_document_events
        BEGIN
          SELECT RAISE(ABORT, 'events_are_append_only');
        END`
    },
    {
      type: "trigger",
      name: "doc_events_no_delete",
      sql: `CREATE TRIGGER doc_events_no_delete
        BEFORE DELETE ON doc_document_events
        BEGIN
          SELECT RAISE(ABORT, 'events_are_append_only');
        END`
    }
  ];
}

export function documentsSchemaDefinitions() {
  return schemaDefinitions().map((item) => ({ ...item, sql: item.sql.trim() }));
}

export function documentsSchemaSql() {
  const ddl = documentsSchemaDefinitions().map((item) => item.sql);
  const seeds = [
    `INSERT INTO doc_sequences (
      series_key, issuer_id, doc_type, next_value, display_pattern,
      is_test, bootstrapped_at, bootstrap_note, updated_at
    ) VALUES (
      'test:CC', 'test', 'cc', 1, 'TEST-CC {n}',
      1, CURRENT_TIMESTAMP, 'seeded by PREPARE_DOCUMENTS_STORAGE', CURRENT_TIMESTAMP
    )`,
    `INSERT INTO doc_sequences (
      series_key, issuer_id, doc_type, next_value, display_pattern,
      is_test, bootstrapped_at, bootstrap_note, updated_at
    ) VALUES (
      'test:INV', 'test', 'invoice', 1, 'TEST-INV {n:04}',
      1, CURRENT_TIMESTAMP, 'seeded by PREPARE_DOCUMENTS_STORAGE', CURRENT_TIMESTAMP
    )`
  ];
  return [...ddl, ...seeds].map((sql) => sql.trim());
}

export function documentsSchemaPolicy() {
  return Object.freeze({
    version: DOCUMENTS_SCHEMA_VERSION,
    ddlOnPublicTraffic: false,
    explicitPreparationOnly: true,
    seedsOnlyTestSequences: true,
    seedsRealSequences: false,
    usesCmsDb: false,
    usesPublicMediaBucket: false
  });
}
