const { chromium } = require('playwright'); const fs = require('fs'); const assert = require('assert');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
// A tiny grey PNG stands in for the pothole photo.
const PHOTO = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNgYGAAAAAEAAH2FzhVAAAAAElFTkSuQmCC';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 400, height: 860 }, geolocation: { latitude: 19.0473, longitude: 73.0699, accuracy: 12 }, permissions: ['geolocation'] });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let sent = null;
  await p.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('https://khadda.test')) return r.fulfill({ contentType: 'text/html', body: html.replace('GOOGLE_CLIENT_ID = ""', 'GOOGLE_CLIENT_ID = "x"') });
    if (u.includes('nominatim')) return r.fulfill({ json: { display_name: 'x', address: { road: 'Sion-Panvel Highway', neighbourhood: 'Sector 5', suburb: 'Kharghar', city: 'Navi Mumbai', state_district: 'Raigad', postcode: '410210' } }, headers: { 'access-control-allow-origin': '*' } });
    if (u.includes('overpass')) return r.fulfill({ json: { elements: [{ tags: { highway: 'trunk', ref: 'NH66' } }] }, headers: { 'access-control-allow-origin': '*' } });
    if (u.includes('gmail.googleapis')) { sent = JSON.parse(r.request().postData()); return r.fulfill({ json: { id: '1' }, headers: { 'access-control-allow-origin': '*' } }); }
    if (u.includes('accounts.google')) return r.fulfill({ contentType: 'text/javascript', body: 'window.google={accounts:{oauth2:{initTokenClient:c=>({requestAccessToken:()=>c.callback({access_token:"t"})})}}}' });
    return r.abort();
  });
  await p.goto('https://khadda.test/');

  // routing table
  const cases = [
    [{ road: 'Sion-Panvel Highway', suburb: 'Kharghar', city: 'Navi Mumbai' }, 'pmc'],
    [{ road: 'Sion-Panvel Highway', suburb: 'Vashi', city: 'Navi Mumbai', state_district: 'Thane' }, 'nmmc'],
    [{ road: 'Thane-Belapur Road', suburb: 'Airoli', city: 'Navi Mumbai' }, 'nmmc'],
    [{ suburb: 'Dombivli East', city: 'Kalyan-Dombivli', state_district: 'Thane' }, 'kdmc'],
    [{ suburb: 'Naupada', city: 'Thane', state_district: 'Thane' }, 'tmc'],
    [{ suburb: 'Mira Road East', city: 'Mira-Bhayandar' }, 'mbmc'],
    [{ suburb: 'Andheri West', city: 'Mumbai', state_district: 'Mumbai Suburban' }, 'bmc', 'ac.kw@mcgm.gov.in'],
    [{ suburb: 'Worli Koliwada', city: 'Mumbai' }, 'bmc', 'ac.gs@mcgm.gov.in'],
    [{ suburb: 'Lower Parel', city: 'Mumbai' }, 'bmc', 'ac.gs@mcgm.gov.in'],
    [{ suburb: 'Unknownpur', city: 'Mumbai' }, 'bmc', 'che.rt@mcgm.gov.in'],
    [{ city: 'Pune', state_district: 'Pune' }, null],
    [{ village: 'Murud', state_district: 'Thane' }, null]
  ];
  for (const [addr, id, to] of cases) {
    const r = await p.evaluate(a => routeAuthority(a), addr);
    assert.strictEqual(r ? r.id : null, id, JSON.stringify(addr));
    if (to) assert.strictEqual(r.to[0], to, JSON.stringify(addr));
  }
  const gen = await p.evaluate(() => { const m = {}; for (const k of Object.keys(BMC_WARDS)) m[k]=WARD_LABEL[k]; return m; });
  assert.strictEqual(Object.keys(gen).length, 24); assert(Object.values(gen).every(Boolean));
  assert.deepStrictEqual(await p.evaluate(() => parseCoords('19.04460, 73.06700')), { lat: 19.0446, lon: 73.067 });

  // full flow
  await p.fill('#name', 'Test Person'); await p.click('#saveSettings');
  await p.setInputFiles('#gallery', { name: 'p.png', mimeType: 'image/png', buffer: Buffer.from(PHOTO, 'base64') });
  await p.waitForFunction(() => document.getElementById('send').textContent === 'Send from my Gmail');
  console.log(await p.textContent('#authority'), '|', await p.textContent('#highway'));
  await p.click('#send');
  await p.waitForFunction(() => document.getElementById('send').textContent === 'Sent');
  const raw = Buffer.from(sent.raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
  console.log(raw.split('\r\n').slice(0, 5).join('\n'));
  const body = raw.split('Content-Transfer-Encoding: base64\r\n\r\n')[1].split('--khadda')[0];
  const text = Buffer.from(body.replace(/\s/g, ''), 'base64').toString(); console.log(text);
  assert(/To: panvelcorporation@gmail.com/.test(raw)); assert(/image\/jpeg/.test(raw));
  const img = raw.split('Content-Transfer-Encoding: base64\r\n\r\n')[2].split('--khadda')[0];
  assert.strictEqual(Buffer.from(img.replace(/\s/g, ''), 'base64').slice(0, 2).toString('hex'), 'ffd8');
  assert.strictEqual(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  console.log('errors', errs); await b.close(); console.log('PASS');
})().catch(e => { console.error(e); process.exit(1); });
