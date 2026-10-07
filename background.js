import {KEY, read} from './data.js';
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
let requests = Promise.resolve();
const enqueue = task => (requests = requests.catch(() => {}).then(task));
async function hideResponse() {
  const {responseTab} = await chrome.storage.session.get('responseTab');
  if (responseTab !== undefined) await chrome.tabs.sendMessage(responseTab, {type:'na-ponta-hide'}).catch(() => {});
  await chrome.storage.session.remove(['responseTab', 'responseItem']);
}
async function showResponse(message) {
  if (!message.itemId) return hideResponse();
  const data = await read();
  const item = data.items.find(item => item.id === message.itemId);
  if (!item || data.responseMode !== 'overlay') return hideResponse();
  const [tab] = await chrome.tabs.query({active:true, windowId:message.windowId});
  if (!tab?.id) throw new Error('Abra um site nesta janela do Brave e tente novamente.');
  if (!/^https?:\/\//.test(tab.url || '')) throw new Error('O modal funciona em sites HTTP/HTTPS. Abas internas do Brave e páginas da própria extensão não permitem essa exibição. Abra um site e use o painel lateral.');
  const {responseTab, responseItem, overlayOpacity} = await chrome.storage.session.get(['responseTab','responseItem','overlayOpacity']);
  if (message.toggle && responseTab === tab.id && responseItem === item.id) return hideResponse();
  try { await chrome.scripting.executeScript({target:{tabId:tab.id}, files:['overlay.js']}); }
  catch { throw new Error('Não foi possível mostrar o modal neste site. Em brave://extensions → Na Ponta → Detalhes, verifique se o acesso a sites está permitido. Páginas protegidas pelo navegador, como a loja de extensões, não aceitam o modal.'); }
  if (responseTab !== undefined && responseTab !== tab.id) await hideResponse();
  await chrome.tabs.sendMessage(tab.id, {type:'na-ponta-show', item, fontSize:data.fontSize, opacity:overlayOpacity ?? 65});
  await chrome.storage.session.set({responseTab:tab.id, responseItem:item.id});
}
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (sender.id !== chrome.runtime.id) return;
  let task;
  if (message.type === 'response' && !sender.tab?.url?.startsWith('http')) task = () => showResponse(message);
  if (message.type === 'na-ponta-closed' && sender.tab) task = async () => {
    const {responseTab} = await chrome.storage.session.get('responseTab');
    if (responseTab === sender.tab.id) await chrome.storage.session.remove(['responseTab','responseItem']);
  };
  if (message.type === 'na-ponta-opacity' && sender.tab && Number.isFinite(message.value)) task = () => chrome.storage.session.set({overlayOpacity:Math.min(100, Math.max(0,message.value))});
  if (!task) return;
  enqueue(task).then(() => reply({ok:true}), error => reply({ok:false,error:error.message}));
  return true;
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes[KEY]) return;
  enqueue(async () => {
    const {responseTab,responseItem} = await chrome.storage.session.get(['responseTab','responseItem']);
    if (responseTab === undefined) return;
    const data = await read(); const item = data.items.find(item => item.id === responseItem);
    if (!item || data.responseMode !== 'overlay') return hideResponse();
    await chrome.tabs.sendMessage(responseTab, {type:'na-ponta-show',item,fontSize:data.fontSize}).catch(hideResponse);
  });
});
function forgetTab(id) { enqueue(async () => { const {responseTab} = await chrome.storage.session.get('responseTab'); if (responseTab === id) await chrome.storage.session.remove(['responseTab','responseItem']); }); }
chrome.tabs.onRemoved.addListener(forgetTab);
chrome.tabs.onUpdated.addListener((id, change) => { if (change.status === 'loading') forgetTab(id); });
