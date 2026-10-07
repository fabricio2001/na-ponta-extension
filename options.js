import {read, write, search, validate} from './data.js';
const $ = id => document.getElementById(id);
let data, selected = null, limit = 60, queue = Promise.resolve(), ready = false, revision = 0;
let dragged = null;
function clearDrop() { $('items').querySelectorAll('.drop-before,.drop-after').forEach(row => row.classList.remove('drop-before','drop-after')); }
async function moveItem(id, destination) {
  const from = data.items.findIndex(item => item.id === id);
  const to = Math.max(0, Math.min(destination, data.items.length - 1));
  if (from < 0 || from === to) return;
  const [item] = data.items.splice(from, 1); data.items.splice(to, 0, item);
  list();
  $('order-status').textContent = `Movendo para a posição ${to + 1}…`;
  try { await save(); $('order-status').textContent = `Salvo: “${item.question}” na posição ${to + 1} de ${data.items.length}.`; }
  catch { $('order-status').textContent = 'Não foi possível salvar a ordem. Exporte um backup e tente novamente.'; }
}
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
  const positions = new Map(data.items.map((item, index) => [item.id, index]));
  for (const item of results.slice(0, limit)) {
    const row = document.createElement('div'); row.className = 'library-row' + (selected === item.id ? ' selected' : '');
    row.dataset.id = item.id;
    const index = positions.get(item.id);
    const handle = document.createElement('button'); handle.className = 'drag-handle'; handle.textContent = '⠿'; handle.draggable = true;
    handle.title = 'Arraste para ordenar. Pelo teclado: setas para mover, Home para o topo e End para o fim.';
    handle.setAttribute('aria-label', `Ordenar: ${item.question}`);
    handle.ondragstart = event => { dragged = item.id; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain',item.id); event.dataTransfer.setDragImage(row,20,20); row.classList.add('dragging'); };
    handle.ondragend = () => { dragged = null; row.classList.remove('dragging'); clearDrop(); };
    handle.onkeydown = async event => {
      const targets = {ArrowUp:index-1,ArrowDown:index+1,Home:0,End:data.items.length-1};
      if (!(event.key in targets)) return;
      event.preventDefault(); await moveItem(item.id,targets[event.key]);
      [...$('items').children].find(row => row.dataset.id === item.id)?.querySelector('.drag-handle').focus();
    };
    row.append(handle);
    const button = document.createElement('button'); button.className = 'item-select'; button.textContent = item.question; button.onclick = () => select(item.id); button.setAttribute('aria-pressed', String(selected === item.id)); row.append(button);
    const actions = document.createElement('div'); actions.className = 'order-actions';
    for (const [destination, label] of [[0,'Topo'],[data.items.length-1,'Fim']]) {
      const move = document.createElement('button'); move.className = 'order-jump'; move.textContent = label; move.title = `Mover para o ${label.toLowerCase()} da lista completa`; move.setAttribute('aria-label', `Mover para o ${label.toLowerCase()}: ${item.question}`); move.disabled = index === destination;
      move.onclick = () => moveItem(item.id,destination); actions.append(move);
    }
    row.append(actions);
    row.ondragover = event => {
      if (!dragged || dragged === item.id) return;
      event.preventDefault(); event.dataTransfer.dropEffect = 'move'; clearDrop();
      row.classList.add(event.clientY < row.getBoundingClientRect().top + row.offsetHeight/2 ? 'drop-before' : 'drop-after');
      const bounds = $('items').getBoundingClientRect();
      if (event.clientY < bounds.top+35) $('items').scrollTop -= 18;
      else if (event.clientY > bounds.bottom-35) $('items').scrollTop += 18;
    };
    row.ondrop = event => {
      if (!dragged || dragged === item.id) return;
      event.preventDefault();
      const from = data.items.findIndex(item => item.id === dragged);
      const target = data.items.findIndex(candidate => candidate.id === item.id);
      const after = event.clientY >= row.getBoundingClientRect().top + row.offsetHeight/2;
      const destination = target + Number(after) - Number(from < target);
      const id = dragged; dragged = null; clearDrop(); moveItem(id,destination);
    };
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
