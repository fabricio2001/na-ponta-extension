export const KEY = 'naPonta';
export const empty = () => ({ version: 1, fontSize: 18, responseMode: 'inline', items: [] });
export const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
export function validate(data) {
  if (!data || data.version !== 1 || !Array.isArray(data.items) || ![16,18,20,22,24].includes(data.fontSize)) throw new Error('Arquivo de backup inválido.');
  const ids = new Set();
  for (const item of data.items) {
    if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id) || typeof item.question !== 'string' || !item.question.trim() || typeof item.answer !== 'string') throw new Error('O backup contém perguntas inválidas ou repetidas.');
    ids.add(item.id);
  }
  if (data.responseMode !== undefined && !['inline', 'floating', 'overlay'].includes(data.responseMode)) throw new Error('Modo de resposta inválido.');
  return { version: 1, fontSize: data.fontSize, responseMode: data.responseMode === 'floating' ? 'overlay' : (data.responseMode || 'inline'), items: data.items.map(({id, question, answer}) => ({id, question, answer})) };
}
export async function read() { const result = await chrome.storage.local.get(KEY); return result[KEY] ? validate(result[KEY]) : empty(); }
export async function write(data) { await chrome.storage.local.set({ [KEY]: validate(data) }); }
export function search(items, query) {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  return items.filter(item => { const text = normalize(item.question + ' ' + item.answer); return terms.every(term => text.includes(term)); });
}
