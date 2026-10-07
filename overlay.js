(() => {
  // Isolated world: reinjection reuses this single reader.
  if (globalThis.naPontaOverlay) return;
  globalThis.naPontaOverlay = true;
  let host, root, box, heading, answer, slider, output, position, drag;
  const send = message => chrome.runtime.sendMessage(message).catch(() => {});
  function hide(notify = false) { host?.remove(); host = null; drag = null; if (notify) send({type:'na-ponta-closed'}); }
  function constrain() {
    const rect = box.getBoundingClientRect();
    position.x = Math.max(8, Math.min(position.x, innerWidth - rect.width - 8));
    position.y = Math.max(8, Math.min(position.y, innerHeight - rect.height - 8));
    box.style.left = position.x + 'px'; box.style.top = position.y + 'px';
  }
  function center() { const rect = box.getBoundingClientRect(); position = {x:(innerWidth - rect.width)/2,y:(innerHeight - rect.height)/2}; constrain(); }
  function element(tag, text, parent) { const node = document.createElement(tag); if (text) node.textContent = text; parent?.append(node); return node; }
  function opacity(value) { box.style.background = `rgba(17, 25, 21, ${value / 100})`; slider.value = 100-value; output.textContent = `${100-value}%`; }
  function mount() {
    host = document.createElement('div'); host.id = 'na-ponta-overlay';
    host.style.cssText = 'all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important;pointer-events:none!important;display:block!important;';
    root = host.attachShadow({mode:'closed'});
    const style = new CSSStyleSheet();
    style.replaceSync(`
      * {box-sizing:border-box} .reader {position:absolute;width:540px;max-width:calc(100vw - 16px);max-height:calc(100vh - 16px);overflow:auto;pointer-events:auto;border:1px solid #a9d4bd66;border-radius:14px;color:#fff;font:15px 'Segoe UI',system-ui,sans-serif;box-shadow:0 12px 45px #0004;text-shadow:0 1px 3px #000;}
      header {display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;cursor:grab;touch-action:none;border-bottom:1px solid #ffffff26;user-select:none;}
      header:active{cursor:grabbing} .brand{font-size:11px;font-weight:700;letter-spacing:1.2px} .actions{display:flex;gap:6px}
      button {font:12px 'Segoe UI',sans-serif;color:#fff;background:#14291fbb;border:1px solid #a9d4bd77;border-radius:7px;padding:7px 9px;cursor:pointer;text-shadow:0 1px 2px #000}
      button:hover{background:#335941} button:focus-visible,input:focus-visible{outline:2px solid #baf3d4;outline-offset:2px}
      main {padding:18px 22px} h2{margin:0 0 14px;font-size:16px;line-height:1.5;color:#baf3d4;overflow-wrap:anywhere} .answer{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.65;font-size:18px}
      footer{display:flex;align-items:center;gap:9px;flex-wrap:wrap;padding:11px 16px;font-size:12px;border-top:1px solid #ffffff26} input{width:110px;accent-color:#9cdbb7} .hint{font-size:10px;margin-left:auto;color:#e0ece5} output{min-width:32px}
    `);
    root.adoptedStyleSheets = [style];
    box = element('section', '', root); box.className = 'reader'; box.setAttribute('role','dialog'); box.setAttribute('aria-label','Resposta — Na Ponta');
    const header = element('header','',box);
    element('span','NA PONTA · ARRASTE PARA MOVER',header).className = 'brand';
    const actions = element('div','',header); actions.className = 'actions';
    const centralize = element('button','Centralizar',actions); centralize.onclick = center;
    const close = element('button','×',actions); close.setAttribute('aria-label','Fechar resposta'); close.onclick = () => hide(true);
    const main = element('main','',box); heading = element('h2','',main); answer = element('div','',main); answer.className = 'answer'; answer.setAttribute('aria-live','polite');
    const footer = element('footer','',box); const label = element('label','Transparência',footer); label.htmlFor = 'opacity';
    slider = element('input','',footer); slider.id = 'opacity'; slider.type = 'range'; slider.min = '0'; slider.max = '100'; slider.step = '5';
    slider.setAttribute('aria-label','Transparência do fundo'); output = element('output','',footer);
    slider.oninput = () => opacity(100-Number(slider.value));
    slider.onchange = () => send({type:'na-ponta-opacity',value:100-Number(slider.value)});
    element('span','Esc para fechar',footer).className = 'hint';
    header.onpointerdown = event => { if (event.button !== 0 || event.target.closest('button')) return; const rect = box.getBoundingClientRect(); drag = {x:event.clientX-rect.left,y:event.clientY-rect.top}; header.setPointerCapture(event.pointerId); event.preventDefault(); };
    header.onpointermove = event => { if (!drag) return; position = {x:event.clientX-drag.x,y:event.clientY-drag.y}; constrain(); };
    header.onpointerup = header.onpointercancel = () => { drag = null; };
    (document.fullscreenElement || document.documentElement).append(host);
  }
  document.addEventListener('keydown', event => { if (host && event.key === 'Escape') { hide(true); event.stopImmediatePropagation(); } }, true);
  addEventListener('resize', () => { if (host) constrain(); });
  document.addEventListener('fullscreenchange', () => { if (host) { (document.fullscreenElement || document.documentElement).append(host); constrain(); } });
  chrome.runtime.onMessage.addListener((message, sender, reply) => {
    if (sender.id !== chrome.runtime.id) return;
    if (message.type === 'na-ponta-hide') { hide(); reply({ok:true}); }
    if (message.type !== 'na-ponta-show') return;
    const fresh = !host;
    if (fresh) mount();
    heading.textContent = message.item.question; answer.textContent = message.item.answer || 'Resposta ainda não preenchida.';
    answer.style.fontSize = message.fontSize + 'px';
    if (fresh || message.opacity !== undefined) opacity(message.opacity ?? 65);
    if (fresh && !position) center(); else constrain();
    reply({ok:true});
  });
})();
