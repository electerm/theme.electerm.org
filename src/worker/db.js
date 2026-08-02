/**
 * D1 database helpers.
 */

export async function getRow (db, query, ...params) {
  const row = await db.prepare(query).bind(...params).first()
  return row ?? null
}

export async function allRows (db, query, ...params) {
  const res = await db.prepare(query).bind(...params).all()
  return res.results ?? []
}

export async function runStmt (db, query, ...params) {
  return db.prepare(query).bind(...params).run()
}
