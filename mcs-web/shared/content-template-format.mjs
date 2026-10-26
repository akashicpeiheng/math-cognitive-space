/** Pure Markdown generation; admission is performed by content-documents.mjs. */
export function renderTemplateDocument(tag, data, body, template) {
  const json = JSON.stringify(data, null, 2);
  const runs = json.match(/`+/g) ?? [];
  const fence = '`'.repeat(Math.max(4, ...runs.map(run => run.length + 1)));
  const banner = template ? `<!-- ${template} · 待填写、待校验草稿；模板标识不是文档身份或证据。 -->\n\n` : '';
  return `${banner}${fence}${tag}\n${json}\n${fence}\n\n${body.trim()}\n`;
}

export function promptReferenceData(data) {
  return JSON.stringify(data, null, 2).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e');
}
