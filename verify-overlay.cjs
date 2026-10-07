// Uses locally fulfilled fixtures at Teams and generic site URLs; no account is accessed.
module.exports = async ({context, worker, page, panel, assert, site = 'https://teams.microsoft.com'}) => {
  const url = site + '/na-ponta-test';
  await context.route(url, route => route.fulfill({contentType:'text/html; charset=utf-8', headers:{'Content-Security-Policy':"style-src 'self'; style-src-attr 'unsafe-inline'; object-src 'none'"}, body:'<!doctype html><html><body style="margin:0;background:linear-gradient(120deg,#445285,#305447);color:white;font:20px system-ui;height:100vh"><h1 style="padding:30px">Reunião · Página de teste</h1><button id="meeting" onclick="this.textContent=\'Funcionando\'">Controle da reunião</button><div style="text-align:center;padding:120px">Conteúdo por trás da resposta</div></body></html>'}));
  const teams = await context.newPage(); await teams.goto(url);
  const tab = await worker.evaluate(async url => (await chrome.tabs.query({url}))[0], url);
  await worker.evaluate(async tabId => chrome.scripting.executeScript({target:{tabId},func:() => {
    const attach = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function(options) { const result = attach.call(this,options); if (this.id === 'na-ponta-overlay') globalThis.__naPontaTestRoot = result; return result; };
  }}),tab.id);
  const inspect = (action, value = null) => worker.evaluate(async ({tabId,action,value}) => {
    const result = await chrome.scripting.executeScript({target:{tabId},func:(action,value) => {
      const root = globalThis.__naPontaTestRoot;
      if (action === 'close') return root.querySelector('[aria-label="Fechar resposta"]').click();
      if (action === 'center') return root.querySelector('button').click();
      if (action === 'opacity') { const input = root.querySelector('input'); input.value = value; input.dispatchEvent(new Event('input')); input.dispatchEvent(new Event('change')); }
      const box = root.querySelector('.reader'); const rect = box.getBoundingClientRect(); const head = root.querySelector('header').getBoundingClientRect();
      return {text:root.querySelector('.answer').textContent,x:rect.x,y:rect.y,width:rect.width,height:rect.height,headX:head.x,headY:head.y,background:getComputedStyle(box).backgroundColor,slider:root.querySelector('input').value,font:root.querySelector('.answer').style.fontSize};
    },args:[action,value]}); return result[0].result;
  },{tabId:tab.id,action,value});
  await worker.evaluate(() => chrome.storage.session.remove('overlayOpacity'));
  await page.locator('#response-mode').selectOption('overlay');
  await page.waitForFunction(() => document.getElementById('mode-status').textContent === 'Preferência salva.');
  await panel.reload();
  const items = await worker.evaluate(async () => (await chrome.storage.local.get('naPonta')).naPonta.items);
  const show = async (id, toggle = false) => {
    await worker.evaluate(async tabId => chrome.tabs.update(tabId,{active:true}),tab.id);
    const result = await panel.evaluate(async ({id,windowId,toggle}) => chrome.runtime.sendMessage({type:'response',itemId:id,windowId,toggle}),{id,windowId:tab.windowId,toggle});
    assert.equal(result.ok,true,result.error);
  };
  const count = context.pages().length;
  await show(items[0].id);
  assert.equal(context.pages().length,count,'Must not create a separate window');
  assert.equal(await teams.locator('#na-ponta-overlay').count(),1);
  let initial = await inspect('read'); assert.match(initial.text,/sexta/); assert.match(initial.background,/0.65/);
  await teams.mouse.move(initial.headX+50,initial.headY+20); await teams.mouse.down(); await teams.mouse.move(initial.headX+130,initial.headY+65,{steps:8}); await teams.mouse.up();
  const moved = await inspect('read'); assert.ok(moved.x > initial.x+50); assert.ok(moved.y > initial.y+20);
  await show(items[1].id); const next = await inspect('read'); assert.match(next.text,/integração/); assert.equal(next.x,moved.x);
  await inspect('opacity',100); assert.match((await inspect('read')).background,/, 0\)/);
  await inspect('opacity',45); assert.match((await inspect('read')).background,/0.55/);
  await inspect('center'); const centered = await inspect('read'); assert.ok(Math.abs(centered.x - (1280-centered.width)/2)<2);
  await teams.locator('#meeting').click(); assert.equal(await teams.locator('#meeting').textContent(),'Funcionando');
  await page.locator('#font').selectOption('24');
  await new Promise(resolve => setTimeout(resolve,150)); assert.equal((await inspect('read')).font,'24px');
  await teams.screenshot({path:'overlay-preview.png'});
  await teams.keyboard.press('Escape'); await teams.locator('#na-ponta-overlay').waitFor({state:'detached'});
  await show(items[0].id); assert.equal((await inspect('read')).slider,'45');
  await show(null); await teams.locator('#na-ponta-overlay').waitFor({state:'detached'});
  await show(items[0].id); await inspect('close'); await teams.locator('#na-ponta-overlay').waitFor({state:'detached'});
  await show(items[0].id,true); await teams.locator('#na-ponta-overlay').waitFor();
  await show(items[0].id,true); await teams.locator('#na-ponta-overlay').waitFor({state:'detached'});
  await show(items[0].id); await teams.reload(); assert.equal(await teams.locator('#na-ponta-overlay').count(),0);
  await page.locator('#response-mode').selectOption('inline'); await panel.reload();
  await panel.getByRole('button',{name:'Qual é o prazo?'}).click(); assert.equal(await panel.locator('.answer:visible').count(),1);
  await teams.close();
};
