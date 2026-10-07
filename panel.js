import {KEY, read, search} from './data.js';
const $ = id => document.getElementById(id);
let data, active = null, limit = 60;
function render() {
  const results = search(data.items, $('search').value);
  document.documentElement.style.setProperty('--answer-size', data.fontSize + 'px');
  $('count').textContent = `${results.length} ${results.length === 1 ? 'pergunta' : 'perguntas'}`;
  $('empty').hidden = data.items.length !== 0;
  $('no-results').hidden = !data.items.length || !!results.length;
  $('more').hidden = results.length <= limit;
  $('list').replaceChildren();
  for (const item of results.slice(0, limit)) {
    const card = document.createElement('section'); card.className = 'topic';
    const button = document.createElement('button'); button.className = 'topic-title';
    const label = document.createElement('span'); label.textContent = item.question;
    const arrow = document.createElement('span'); arrow.textContent = '＋'; arrow.className = 'arrow'; arrow.setAttribute('aria-hidden', 'true');
    button.append(label, arrow);
    const answer = document.createElement('div'); answer.className = 'answer'; answer.id = `answer-${item.id}`;
    button.setAttribute('aria-controls', answer.id);
    const update = () => { const open = active === item.id; const inline = open && data.responseMode !== 'overlay'; button.setAttribute('aria-expanded', String(inline)); answer.hidden = !inline; answer.textContent = inline ? (item.answer || 'Resposta ainda não preenchida.') : ''; arrow.textContent = open ? '−' : '＋'; card.classList.toggle('open', open); };
    button.onclick = async () => {
      active = active === item.id ? null : item.id;
      for (const callback of callbacks) callback();
      if (data.responseMode === 'overlay') {
        try {
          const result = await chrome.runtime.sendMessage({type:'response', itemId:item.id, toggle:true, windowId:(await chrome.windows.getCurrent()).id});
          if (!result?.ok) throw new Error(result?.error || 'Não foi possível mostrar a resposta.');
          $('error').hidden = true;
        } catch (error) { $('error').hidden = false; $('error').textContent = error.message; active = null; refresh(); }
      }
    };
    callbacks.push(update); update(); card.append(button, answer); $('list').append(card);
  }
}
let callbacks = [];
function refresh() { callbacks = []; render(); }
$('settings').onclick = $('start').onclick = () => chrome.runtime.openOptionsPage();
$('search').addEventListener('input', () => { limit = 60; refresh(); });
$('more').onclick = () => { limit += 60; refresh(); };
async function load() { try { data = await read(); if (data.responseMode === 'overlay') active = (await chrome.storage.session.get('responseItem')).responseItem || null; refresh(); $('error').hidden = true; } catch { $('error').hidden = false; $('error').textContent = 'Não foi possível carregar as anotações. Reabra o painel.'; } }
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[KEY]) load();
  if (area === 'session' && changes.responseItem && data?.responseMode === 'overlay') { active = changes.responseItem.newValue || null; refresh(); }
});
load();
