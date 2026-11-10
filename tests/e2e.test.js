const { chromium } = require('playwright'); const fs = require('fs'); const assert = require('assert');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
// A tiny grey PNG stands in for the pothole photo.
const PHOTO = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNgYGAAAAAEAAH2FzhVAAAAAElFTkSuQmCC';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 400, height: 860 }, geolocation: { latitude: 19.0473, longitude: 73.0699, accuracy: 12 }, permissions: ['geolocation', 'clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let sent = null;
  await p.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('https://khadda.test')) return r.fulfill({ contentType: 'text/html', body: html.replace('GOOGLE_CLIENT_ID = ""', 'GOOGLE_CLIENT_ID = "x"') });
    if (u.includes('nominatim')) return r.fulfill({ json: { display_name: 'x', address: { road: 'Sion-Panvel Highway', neighbourhood: 'Sector 5', suburb: 'Kharghar', city: 'Navi Mumbai', state_district: 'Raigad', postcode: '410210' } }, headers: { 'access-control-allow-origin': '*' } });
    if (u.includes('overpass')) return r.fulfill({ json: { elements: [
      { type: 'way', id: 1, tags: { highway: 'trunk', ref: 'NH66', name: 'Sion-Panvel Highway' } },
      { type: 'area', id: 2, tags: { boundary: 'administrative', admin_level: '8', name: 'Panvel Municipal Corporation' } },
      { type: 'area', id: 3, tags: { boundary: 'administrative', admin_level: '6', name: 'Raigad' } },
      { type: 'area', id: 4, tags: { place: 'suburb', name: 'Kharghar' } },
      { type: 'node', id: 5, lat: 19.0500, lon: 73.0700, tags: { place: 'neighbourhood', name: 'Sector 12' } },
      { type: 'node', id: 6, lat: 19.0200, lon: 73.0950, tags: { place: 'suburb', name: 'Kamothe' } }
    ] }, headers: { 'access-control-allow-origin': '*' } });
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
    [{ town: 'Ambarnath', state_district: 'Thane' }, 'ambernath'],
    [{ city: 'Pune', state_district: 'Pune' }, null],
    [{ village: 'Murud', state_district: 'Thane' }, null]
  ];
  for (const [addr, id, to] of cases) {
    const r = await p.evaluate(a => routeAuthority(a), addr);
    assert.strictEqual(r ? r.id : null, id, JSON.stringify(addr));
    if (to) assert.strictEqual(r.to[0], to, JSON.stringify(addr));
  }
  // a containing municipal boundary beats the address; wards can come from a level 9 boundary
  const byBoundary = await p.evaluate(() => routeAll({ suburb: 'Sector 20', city: 'Navi Mumbai' }, { admins: [{ name: 'Panvel Municipal Corporation', level: 8 }, { name: 'Raigad', level: 6 }] }));
  assert.strictEqual(byBoundary.id, 'pmc'); assert.strictEqual(byBoundary.viaField, 'boundary');
  assert.strictEqual((await p.evaluate(() => routeAll({ suburb: 'Sector 20', city: 'Navi Mumbai' }, { admins: [{ name: 'Raigad', level: 6 }] }))).id, 'nmmc', 'a district boundary alone changes nothing');
  assert.strictEqual((await p.evaluate(() => routeAll({ suburb: 'Sector 20', city: 'Navi Mumbai' }, null))).id, 'nmmc');
  const ward = await p.evaluate(() => routeAll({ city: 'Mumbai' }, { admins: [{ name: 'Mumbai', level: 8 }, { name: 'K/West', level: 9 }] }));
  assert.strictEqual(ward.to[0], 'ac.kw@mcgm.gov.in'); assert.strictEqual(ward.ward, 'K/West');
  assert.strictEqual((await p.evaluate(() => routeAll({ city: 'Mumbai' }, { admins: [{ name: 'Thane', level: 6 }] }))).id, 'bmc', 'Thane district contains no Mumbai, but the address still routes');
  assert.deepStrictEqual(await p.evaluate(() => ['K/East', 'Ward K W', 'F/North', 'n', 'East', 'Sector 5', 'K/West Ward'].map(wardKey)), ['ke', 'kw', 'fn', 'n', null, null, 'kw']);
  const parsed = await p.evaluate(() => parseOverpass({ elements: [
    { type: 'way', tags: { highway: 'trunk', ref: 'NH66' } }, { type: 'area', tags: { boundary: 'administrative', admin_level: '8', name: 'Panvel Municipal Corporation' } },
    { type: 'area', tags: { place: 'suburb', name: 'Kharghar' } }, { type: 'node', lat: 19.05, lon: 73.07, tags: { place: 'neighbourhood', name: 'Sector 12' } },
    { type: 'node', lat: 19.02, lon: 73.095, tags: { place: 'suburb', name: 'Kamothe' } }, { type: 'area', tags: { place: 'suburb' } } ] }, 19.0473, 73.0699));
  assert.strictEqual(parsed.highway.ref, 'NH66'); assert.deepStrictEqual(parsed.admins, [{ name: 'Panvel Municipal Corporation', level: 8 }]);
  assert.deepStrictEqual(parsed.places, [{ name: 'Kharghar', place: 'suburb' }]);
  assert.deepStrictEqual(parsed.nearby.map(n => n.name), ['Sector 12', 'Kamothe']); assert(parsed.nearby[0].m > 200 && parsed.nearby[0].m < 400, 'about 300 m away');
  assert.strictEqual(await p.evaluate(() => areaFrom({ address: { suburb: 'New Panvel' } }, { places: [{ name: 'Old Panvel', place: 'suburb' }] })), 'Old Panvel', 'a containing polygon beats the geocoder');
  assert.strictEqual(await p.evaluate(() => areaFrom({ address: { suburb: 'New Panvel', neighbourhood: 'Sector 2' } }, null)), 'New Panvel');
  // representatives: the CMO only, and only on a real authority
  assert.deepStrictEqual(await p.evaluate(() => representatives().map(r => r.email)), ['chiefminister@maharashtra.gov.in']);
  assert(/^[^@\s,]+@[^@\s,]+\.[^@\s,]+$/.test(await p.evaluate(() => CMO.email)));

  const gen = await p.evaluate(() => { const m = {}; for (const k of Object.keys(BMC_WARDS)) m[k]=WARD_LABEL[k]; return m; });
  assert.strictEqual(Object.keys(gen).length, 24); assert(Object.values(gen).every(Boolean));
  assert.deepStrictEqual(await p.evaluate(() => parseCoords('19.04460, 73.06700')), { lat: 19.0446, lon: 73.067 });

  // full flow
  await p.fill('#name', 'Test Person'); await p.click('#saveSettings');
  await p.setInputFiles('#gallery', { name: 'p.png', mimeType: 'image/png', buffer: Buffer.from(PHOTO, 'base64') });
  await p.waitForFunction(() => document.getElementById('send').textContent === 'Send from my Gmail');
  console.log(await p.textContent('#authority'), '|', await p.textContent('#highway'));
  // the area comes from the containing polygon, the chips offer the other names, and a changed area rewrites the draft
  await p.evaluate(() => { document.getElementById('edit').open = true; });
  assert.strictEqual(await p.inputValue('#areaName'), 'Kharghar');
  const chips = await p.$$eval('#nearby .chip', els => els.map(e => e.textContent));
  assert.deepStrictEqual(chips, ['Sector 12', 'Kamothe', 'Sector 5']);
  assert(/Sion-Panvel Highway, Kharghar/.test(await p.inputValue('#subject')));
  await p.fill('#areaName', 'Old Panvel');
  assert(/Sion-Panvel Highway, Old Panvel/.test(await p.inputValue('#subject')));
  assert(/Location: Sion-Panvel Highway, Sector 5, Old Panvel, Navi Mumbai/.test(await p.inputValue('#bodyText')));
  assert(/Old Panvel/.test(await p.textContent('#place')));
  assert((await p.$$eval('#nearby .chip', els => els.map(e => e.textContent))).includes('Kharghar'), 'the previous name is offered back');
  await p.click('#nearby .chip:has-text("Kharghar")');
  assert.strictEqual(await p.inputValue('#areaName'), 'Kharghar');
  assert(/Sion-Panvel Highway, Kharghar/.test(await p.inputValue('#subject')));
  // the diagnostics copy holds the map answers and nothing personal
  await p.click('#copyDetails');
  const details = JSON.parse(await p.evaluate(() => navigator.clipboard.readText()));
  assert.strictEqual(details.authority.id, 'pmc'); assert.strictEqual(details.authority.via, 'boundary');
  assert.strictEqual(details.map.admins[0].name, 'Panvel Municipal Corporation'); assert.strictEqual(details.nominatim.address.suburb, 'Kharghar');
  assert(!JSON.stringify(details).includes('Test Person'));
  // the confirm step: cancel brings Send back, confirm actually sends
  await p.click('#send');
  await p.waitForSelector('#confirm:not([hidden])');
  assert(sent === null, 'nothing is sent before confirming');
  const ask = await p.textContent('#confirmText'); console.log(ask);
  assert(/Panvel Municipal Corporation at panvelcorporation@gmail.com/.test(ask));
  await p.click('#cancelSend');
  await p.waitForSelector('#send:not([hidden])');
  assert(sent === null, 'nothing is sent after cancelling');
  await p.click('#send'); await p.click('#confirmSend');
  await p.waitForFunction(() => document.getElementById('send').textContent === 'Sent');
  const raw = Buffer.from(sent.raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
  console.log(raw.split('\r\n').slice(0, 5).join('\n'));
  const body = raw.split('Content-Transfer-Encoding: base64\r\n\r\n')[1].split('--khadda')[0];
  const text = Buffer.from(body.replace(/\s/g, ''), 'base64').toString(); console.log(text);
  assert(/To: panvelcorporation@gmail.com/.test(raw)); assert(/image\/jpeg/.test(raw));
  assert(/Cc: chiefminister@maharashtra.gov.in/.test(raw), 'the CMO is copied on a real complaint');
  assert(!/sansad/.test(raw), 'no MP or MLA is copied');
  assert(/Copy to Chief Minister/.test(await p.textContent('#authority')));
  // a "Someone else" test must reach nobody but the typed address
  const custom = await p.evaluate(() => { document.getElementById('authoritySelect').value = 'custom'; document.getElementById('authoritySelect').dispatchEvent(new Event('change')); document.getElementById('customTo').value = 'me@example.com'; document.getElementById('customTo').dispatchEvent(new Event('input')); return recipients(); });
  assert.deepStrictEqual(custom.cc, []); assert.deepStrictEqual(custom.to, ['me@example.com']);
  const img = raw.split('Content-Transfer-Encoding: base64\r\n\r\n')[2].split('--khadda')[0];
  assert.strictEqual(Buffer.from(img.replace(/\s/g, ''), 'base64').slice(0, 2).toString('hex'), 'ffd8');
  assert.strictEqual(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  console.log('errors', errs); await b.close(); console.log('PASS');
})().catch(e => { console.error(e); process.exit(1); });
