/** Authoring stays outside the learner schema and its profile exports. */
export function authoringDriver(driver) {
  if (driver.dialect !== 'postgres' || driver.authoringScoped) return driver;
  const tables = new Set(['meta', 'drafts', 'runs', 'candidates', 'publications']);
  // Only identifiers are qualified. Quoted SQL strings and parameter values stay intact.
  const qualify = sql => sql.replace(/'(?:''|[^'])*'|(?<![\w.])\b[a-z_][a-z_0-9]*\b/gi,
    token => tables.has(token.toLowerCase()) ? `mcs_authoring.${token}` : token);
  return {
    ...driver,
    authoringScoped: true,
    all: (sql, params) => driver.all(qualify(sql), params),
    get: (sql, params) => driver.get(qualify(sql), params),
    run: (sql, params) => driver.run(qualify(sql), params),
    exec: sql => driver.exec(qualify(sql)),
  };
}
