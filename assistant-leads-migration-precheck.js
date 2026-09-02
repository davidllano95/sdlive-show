function databaseFromEnv(env) {
  const db = env?.CMS_DB;
  if (!db || typeof db.prepare !== "function") {
    throw new Error("CMS_DB binding is missing");
  }
  return db;
}

function safeColumns(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    cid: Number(row?.cid) || 0,
    name: String(row?.name || ""),
    type: String(row?.type || ""),
    notNull: Number(row?.notnull || 0) === 1,
    defaultValue: row?.dflt_value ?? null,
    primaryKey: Number(row?.pk || 0) > 0
  }));
}

function referencesLeads(row) {
  if (String(row?.tbl_name || "").toLowerCase() === "leads") return true;
  const sql = String(row?.sql || "");
  return /\breferences\s+(?:"leads"|`leads`|\[leads\]|leads)\b/i.test(sql);
}

function dependentTableNames(rows) {
  const names = new Set(["leads"]);

  for (const row of Array.isArray(rows) ? rows : []) {
    if (String(row?.type || "").toLowerCase() !== "table") continue;
    if (!referencesLeads(row)) continue;

    const name = String(row?.name || row?.tbl_name || "").trim().toLowerCase();
    if (name) names.add(name);
  }

  return names;
}

function safeSchemaObjects(rows) {
  const source = Array.isArray(rows) ? rows : [];
  const dependentTables = dependentTableNames(source);

  return source
    .filter((row) => {
      const tableName = String(row?.tbl_name || "").trim().toLowerCase();
      return dependentTables.has(tableName) || referencesLeads(row);
    })
    .map((row) => ({
      type: String(row?.type || ""),
      name: String(row?.name || ""),
      table: String(row?.tbl_name || ""),
      sql: String(row?.sql || "")
    }));
}

/**
 * Read-only schema probe used only after the normal Assistant preflight reports
 * a blocked legacy `leads` shape. It returns DDL metadata only; it never reads
 * Lead row content and never mutates D1.
 */
export async function inspectAssistantLeadsMigrationPrecheck(env) {
  const db = databaseFromEnv(env);

  const [tableInfo, schema] = await Promise.all([
    db.prepare("PRAGMA table_info(leads)").all(),
    db.prepare(`
      SELECT type, name, tbl_name, sql
      FROM sqlite_master
      WHERE sql IS NOT NULL
      ORDER BY type, name
    `).all()
  ]);

  const columns = safeColumns(tableInfo?.results);
  const schemaObjects = safeSchemaObjects(schema?.results);
  const leadsTable = schemaObjects.find((item) =>
    item.type.toLowerCase() === "table" &&
    item.name.toLowerCase() === "leads"
  );

  return {
    ok: true,
    readOnly: true,
    columns,
    tableSql: leadsTable?.sql || null,
    relatedSchema: schemaObjects
  };
}
