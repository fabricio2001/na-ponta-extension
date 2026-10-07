import {read, write, search, validate} from './data.js';
const $ = id => document.getElementById(id);
let data, selected = null, limit = 60, queue = Promise.resolve(), ready = false, revision = 0;
function save() {
  const snapshot = structuredClone(data);
  const current = ++revision;
  $('status').textContent = 'Salvando…';
  queue = queue.catch(() => {}).then(() => write(snapshot));
  queue.then(() => { if (current === revision) $('status').textContent = 'Salvo'; }, () => { if (current === revision) $('status').textContent = 'Erro ao salvar. Exporte um backup e tente novamente.'; });
  return queue;
}
function list() {
  const results = search(data.items, $('filter').value);
  $('count').textContent = data.items.length;
  $('items').replaceChildren(); $('more').hidden = results.length <= limit;
  if (!results.length) { const p = document.createElement('p'); p.className = 'muted'; p.textContent = data.items.length ? 'Nenhuma pergunta encontrada.' : 'Suas perguntas aparecerão aqui.'; $('items').append(p); }
  for (const item of results.slice(0, limit)) {
    const row = document.createElement('div'); row.className = 'library-row' + (selected === item.id ? ' selected' : '');
    const button = document.createElement('button'); button.className = 'item-select'; button.textContent = item.question; button.onclick = () => select(item.id); button.setAttribute('aria-pressed', String(selected === item.id)); row.append(button);
    for (const [offset, label] of [[-1, '↑'], [1, '↓']]) {
      const move = document.createElement('button'); move.className = 'move'; move.textContent = label; move.title = offset < 0 ? 'Mover para cima' : 'Mover para baixo'; move.setAttribute('aria-label', `${move.title}: ${item.question}`);
      const index = data.items.indexOf(item); move.disabled = index + offset < 0 || index + offset >= data.items.length;
      move.onclick = () => { [data.items[index], data.items[index + offset]] = [data.items[index + offset], data.items[index]]; save(); list(); }; row.append(move);
    }
    $('items').append(row);
  }
}
function select(id) {
  selected = id; const item = data.items.find(x => x.id === id);
  $('form').hidden = !item; $('welcome').hidden = !!item;
  $('question').setCustomValidity('');
  if (item) { $('question').value = item.question; $('answer').value = item.answer; }
  list();
}
$('form').onsubmit = event => event.preventDefault();
$('add').onclick = () => { const item = { id: crypto.randomUUID(), question: 'Nova pergunta', answer: '' }; data.items.unshift(item); $('filter').value = ''; save(); select(item.id); $('question').focus(); $('question').select(); };
for (const field of ['question', 'answer']) $(''+field).addEventListener('input', () => {
  const item = data.items.find(x => x.id === selected);
  if (!$('question').value.trim()) { $('question').setCustomValidity('Escreva uma pergunta.'); $('status').textContent = 'Preencha a pergunta para salvar.'; return; }
  $('question').setCustomValidity(''); item.question = $('question').value; item.answer = $('answer').value; save(); list();
});
$('delete').onclick = () => { if (!confirm('Excluir esta pergunta e sua resposta?')) return; data.items = data.items.filter(x => x.id !== selected); save(); select(null); };
$('filter').oninput = () => { limit = 60; list(); }; $('more').onclick = () => { limit += 60; list(); };
function font() { $('font').value = data.fontSize; $('sample').style.fontSize = data.fontSize + 'px'; $('response-mode').value = data.responseMode; }
$('response-mode').onchange = async () => {
  data.responseMode = $('response-mode').value;
  $('mode-status').textContent = 'Salvando…';
  try { await save(); $('mode-status').textContent = 'Preferência salva.'; }
  catch { $('mode-status').textContent = 'Não foi possível salvar. Tente novamente.'; }
};
$('font').onchange = () => { data.fontSize = Number($('font').value); font(); save(); };
$('export').onclick = () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'}); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `na-ponta-backup-${new Date().toISOString().slice(0,10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  $('backup-status').textContent = 'Backup exportado.';
};
$('import').onclick = () => $('file').click();
$('file').onchange = async () => {
  try {
    const file = $('file').files[0]; if (!file) return;
    if (file.size > 10 * 1024 * 1024) throw new Error('O arquivo ultrapassa 10 MB.');
    const incoming = validate(JSON.parse(await file.text()));
    if (!confirm(`Importar ${incoming.items.length} perguntas? Isso substituirá suas anotações e o tamanho da letra. Exporte um backup antes se quiser guardar os dados atuais.`)) return;
    await queue.catch(() => {}); await write(incoming); data = incoming; selected = null; $('filter').value = ''; font(); select(null); $('backup-status').textContent = 'Backup importado com sucesso.';
  } catch (error) { $('backup-status').textContent = 'Não foi possível importar: ' + error.message; } finally { $('file').value = ''; }
};
async function init() { try { data = await read(); ready = true; font(); list(); } catch { $('fatal').hidden = false; $('fatal').textContent = 'Não foi possível carregar os dados. Reabra as configurações.'; $('app').hidden = true; } }
// A single editor prevents two tabs from overwriting one another's changes.
if (navigator.locks) navigator.locks.request('na-ponta-editor', {ifAvailable: true}, async lock => {
  if (!lock) { document.querySelector('.workspace').innerHTML = '<h1>Configurações já abertas</h1><p>Use a outra aba de configurações para editar suas anotações. Feche esta aba ou recarregue depois de fechar a outra.</p>'; return; }
  await init(); await new Promise(() => {});
}); else init();
document.querySelectorAll('button, input, select, textarea').forEach(element => element.addEventListener('click', event => { if (!ready) event.preventDefault(); }, true));
