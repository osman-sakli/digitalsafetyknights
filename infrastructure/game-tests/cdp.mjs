// usage: [PHONE=1] node cdp.mjs URL WAIT_MS 'expr' ...   real-time headless Chrome, prints each result + errors
import { spawn } from 'node:child_process'; import fs from 'node:fs';
const [url, wait, ...exprs] = process.argv.slice(2);
const port = 9500 + Math.floor(Math.random() * 400), prof = '/tmp/cdp-prof-' + port;
const ch = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', `--remote-debugging-port=${port}`, '--user-data-dir=' + prof, '--window-size=1280,720', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let t; for (let i = 0; i < 60; i++) { try { t = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(200); } }
const ws = new WebSocket(t.find(x => x.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = {}, logs = [];
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend[m.id]) { pend[m.id](m); delete pend[m.id]; }
  if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + String(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 300));
  if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) logs.push('HTTP ' + m.params.response.status + ' ' + m.params.response.url); };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
await send('Runtime.enable'); await send('Network.enable'); await send('Page.enable');
if (!process.env.PHONE) await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
if (process.env.PHONE) { await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }); }
await send('Page.navigate', { url }); await sleep(+wait);
for (const ex of exprs) { const r = await send('Runtime.evaluate', { expression: ex, returnByValue: true, awaitPromise: true }); console.log(JSON.stringify(r.result?.result?.value ?? r.result?.exceptionDetails?.exception?.description ?? r.result?.exceptionDetails?.text)); }
if (process.env.SHOT) { await sleep(600); const sh = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(process.env.SHOT, Buffer.from(sh.result.data, 'base64')); }
console.log('logs:', logs.length ? JSON.stringify(logs) : 'none');
ws.close(); ch.kill(); await sleep(300); fs.rmSync(prof, { recursive: true, force: true });
