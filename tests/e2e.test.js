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
  let sent = null, mapsMode = 'ok', osmCalls = 0, mapsUrl = '';
  // What Google's geocoder returns for a pin in old Panvel, in its own shape.
  const GOOGLE_RESULTS = [
    { formatted_address: '12, Shivaji Road, Old Panvel, Panvel, Maharashtra 410206, India', address_components: [
      { long_name: '12', types: ['street_number'] }, { long_name: 'Shivaji Road', types: ['route'] },
      { long_name: 'Old Panvel', types: ['political', 'sublocality', 'sublocality_level_1'] }, { long_name: 'Panvel', types: ['locality', 'political'] },
      { long_name: 'Raigad', types: ['administrative_area_level_3', 'political'] }, { long_name: 'Maharashtra', types: ['administrative_area_level_1', 'political'] },
      { long_name: '410206', types: ['postal_code'] } ] },
    { formatted_address: 'Panvel, Maharashtra, India', address_components: [{ long_name: 'Panvel', types: ['locality', 'political'] }] }
  ];
  await ctx.route('**/*', r => {
    const u = r.request().url();
    // "/" is the page as shipped without a Maps key; "/g" is the same page with one.
    if (u.startsWith('https://khadda.test')) return r.fulfill({ contentType: 'text/html', body: u.endsWith('/g') ? html.replace(/GOOGLE_MAPS_KEY = "[^"]*"/, 'GOOGLE_MAPS_KEY = "test-key"') : html.replace(/GOOGLE_MAPS_KEY = "[^"]*"/, 'GOOGLE_MAPS_KEY = ""') });
    if (u.includes('maps.googleapis.com/maps/api/js')) {
      mapsUrl = u;
      if (mapsMode === 'fail') return r.abort();
      return r.fulfill({ contentType: 'text/javascript', body: 'window.google=window.google||{};google.maps={importLibrary:async()=>({Geocoder:class{geocode(q){window.__geoReq=q;return ' + (mapsMode === 'denied' ? 'Promise.reject(new Error("REQUEST_DENIED"))' : 'Promise.resolve({results:' + JSON.stringify(GOOGLE_RESULTS) + '})') + '}}})};window.__khaddaMaps();' });
    }
    if (u.includes('nominatim')) osmCalls++;
    if (u.includes('nominatim')) return r.fulfill({ json: { display_name: 'x', address: { road: 'Sion-Panvel Highway', neighbourhood: 'Sector 5', suburb: 'Kharghar', city: 'Navi Mumbai', state_district: 'Raigad', postcode: '410210' } }, headers: { 'access-control-allow-origin': '*' } });
    if (u.includes('overpass')) return r.fulfill({ json: { elements: [
      { type: 'way', id: 1, tags: { highway: 'trunk', ref: 'NH66', name: 'Sion-Panvel Highway' } },
      { type: 'area', id: 2, tags: { boundary: 'administrative', admin_level: '8', name: 'Panvel Municipal Corporation' } },
      { type: 'area', id: 3, tags: { boundary: 'administrative', admin_level: '6', name: 'Raigad' } },
      { type: 'area', id: 4, tags: { place: 'suburb', name: 'Kharghar' } },
      { type: 'node', id: 5, lat: 19.0500, lon: 73.0700, tags: { place: 'neighbourhood', name: 'Sector 12' } },
      { type: 'node', id: 6, lat: 19.0200, lon: 73.0950, tags: { place: 'suburb', name: 'Kamothe' } },
      { type: 'node', id: 7, lat: 19.0475, lon: 73.0701, tags: { amenity: 'bank', name: 'State Bank of India' } },
      { type: 'node', id: 8, lat: 19.04735, lon: 73.06995, tags: { shop: 'kiosk', name: 'Raju Pan Shop' } },
      { type: 'way', id: 9, center: { lat: 19.0490, lon: 73.0699 }, tags: { leisure: 'park', name: 'Central Park' } },
      { type: 'node', id: 10, lat: 19.0473, lon: 73.0699, tags: { amenity: 'parking', name: 'Pay and Park' } }
    ] }, headers: { 'access-control-allow-origin': '*' } });
    if (u.includes('gmail.googleapis')) { sent = JSON.parse(r.request().postData()); return r.fulfill({ json: { id: '1' }, headers: { 'access-control-allow-origin': '*' } }); }
    if (u.includes('accounts.google')) return r.fulfill({ contentType: 'text/javascript', body: 'window.google=window.google||{};google.accounts={oauth2:{initTokenClient:c=>({requestAccessToken:()=>c.callback({access_token:"t"})})}}' });
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
  // the area name: a clearly closer label beats the geocoder, a similar one does not
  const area = (address, nearby) => p.evaluate(([a, n]) => areaFrom({ address: a }, { places: [], nearby: n }), [address, nearby]);
  assert.strictEqual(await area({ suburb: 'New Panvel', town: 'Panvel' }, [{ name: 'Panvel', place: 'town', m: 400 }, { name: 'New Panvel', place: 'suburb', m: 1500 }]), 'Panvel', 'old Panvel is Panvel, not New Panvel');
  assert.strictEqual(await area({ suburb: 'New Panvel', town: 'Panvel' }, [{ name: 'Panvel', place: 'town', m: 900 }, { name: 'New Panvel', place: 'suburb', m: 1000 }]), 'New Panvel', 'similar distances do not flip the answer');
  assert.strictEqual(await area({ suburb: 'New Panvel', town: 'Panvel' }, [{ name: 'New Panvel', place: 'suburb', m: 300 }, { name: 'Panvel', place: 'town', m: 1400 }]), 'New Panvel');
  assert.strictEqual(await area({ suburb: 'Vashi', city: 'Navi Mumbai' }, [{ name: 'Sanpada', place: 'suburb', m: 500 }, { name: 'Vashi', place: 'suburb', m: 1800 }]), 'Sanpada');
  assert.strictEqual(await area({ suburb: 'Nerul' }, [{ name: 'Seawoods', place: 'suburb', m: 300 }]), 'Nerul', 'a geocoder name the map cannot place is left alone');
  assert.strictEqual(await area({ city: 'Navi Mumbai' }, [{ name: 'Kamothe', place: 'suburb', m: 600 }]), 'Kamothe', 'the nearest label fills a gap');
  assert.strictEqual(await area({ city: 'Navi Mumbai' }, [{ name: 'Sector 9', place: 'neighbourhood', m: 100 }]), 'Navi Mumbai', 'a sector is never the area');
  assert.strictEqual(await area({ suburb: 'Fort', city: 'Mumbai' }, [{ name: 'Fort', place: 'suburb', m: 300 }, { name: 'Mumbai', place: 'city', m: 350 }]), 'Fort', 'a city label does not swallow a suburb at a similar distance');
  const hood = (address, nearby) => p.evaluate(([a, n]) => hoodFrom({ address: a }, { places: [], nearby: n }), [address, nearby]);
  assert.strictEqual(await hood({ neighbourhood: 'Sector 5' }, [{ name: 'Sector 12', place: 'neighbourhood', m: 300 }]), 'Sector 5');
  assert.strictEqual(await hood({ neighbourhood: 'Sector 5' }, [{ name: 'Sector 12', place: 'neighbourhood', m: 150 }, { name: 'Sector 5', place: 'neighbourhood', m: 900 }]), 'Sector 12');
  assert.strictEqual(await hood({ neighbourhood: 'Sector 5' }, [{ name: 'Sector 5', place: 'neighbourhood', m: 1200 }]), '', 'a sector over 800 m away is not named');
  assert.strictEqual(await hood({}, [{ name: 'Sector 12', place: 'neighbourhood', m: 300 }]), 'Sector 12');
  assert.strictEqual(await hood({}, [{ name: 'Sector 12', place: 'neighbourhood', m: 700 }]), '');
  // landmarks: well-known kinds win over a nearer kiosk, outlines count as 80 m, parking is never a landmark
  const marks = await p.evaluate(() => parseOverpass({ elements: [
    { type: 'node', lat: 19.0475, lon: 73.0701, tags: { amenity: 'bank', name: 'State Bank of India' } },
    { type: 'node', lat: 19.04735, lon: 73.06995, tags: { shop: 'kiosk', name: 'Raju Pan Shop' } },
    { type: 'way', center: { lat: 19.049, lon: 73.0699 }, tags: { leisure: 'park', name: 'Central Park' } },
    { type: 'node', lat: 19.0473, lon: 73.0699, tags: { amenity: 'parking', name: 'Pay and Park' } },
    { type: 'way', center: { lat: 19.0473, lon: 73.0699 }, tags: { railway: 'rail', name: 'Harbour Line' } },
    { type: 'node', lat: 19.0473, lon: 73.0699, tags: { amenity: 'bank' } } ] }, 19.0473, 73.0699).landmarks);
  assert.deepStrictEqual(marks.map(m => m.name), ['State Bank of India', 'Raju Pan Shop', 'Central Park']);
  assert.strictEqual(marks[2].m, 80);
  const noRoad = await p.evaluate(() => draft({ lat: 19, lon: 73, geo: { address: {} }, area: 'Kharghar', hood: '', landmark: { name: 'State Bank of India' }, auth: null, highway: null, who: { name: 'A' }, when: 'now' }));
  assert(/^Pothole needing repair: near State Bank of India, Kharghar \(/.test(noRoad.subject));
  assert(/Nearest landmark: State Bank of India/.test(noRoad.body));
  assert.strictEqual(await p.evaluate(() => placeLine({ address: { road: 'MG Road', neighbourhood: 'Sector 5', city: 'Panvel' } }, 'Panvel', '')), 'MG Road, Panvel', 'an empty sector is left out and the town is not repeated');
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
  assert(/Near State Bank of India/.test(await p.textContent('#place')));
  assert(/Location: .*\nNearest landmark: State Bank of India\nCoordinates: /.test(await p.inputValue('#bodyText')));
  assert((await p.$$eval('#nearby .chip', els => els.map(e => e.textContent))).includes('Kharghar'), 'the previous name is offered back');
  await p.click('#nearby .chip:has-text("Kharghar")');
  assert.strictEqual(await p.inputValue('#areaName'), 'Kharghar');
  assert(/Sion-Panvel Highway, Kharghar/.test(await p.inputValue('#subject')));
  // the diagnostics copy holds the map answers and nothing personal
  await p.click('#copyDetails');
  const details = JSON.parse(await p.evaluate(() => navigator.clipboard.readText()));
  assert.strictEqual(details.authority.id, 'pmc'); assert.strictEqual(details.authority.via, 'boundary');
  assert.strictEqual(details.map.admins[0].name, 'Panvel Municipal Corporation'); assert.strictEqual(details.geocoder.address.suburb, 'Kharghar'); assert.strictEqual(details.geocoder.source, 'nominatim');
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
  assert.strictEqual(mapsUrl, '', 'without a key the page never contacts Google Maps');
  assert(!/Powered by Google/.test(await p.textContent('#place')));

  // Google's results become the same address shape, most specific result first
  const conv = await p.evaluate(r => fromGoogle(r), GOOGLE_RESULTS);
  assert.deepStrictEqual(conv.address, { road: 'Shivaji Road', suburb: 'Old Panvel', city: 'Panvel', state_district: 'Raigad', state: 'Maharashtra', postcode: '410206' });
  assert.strictEqual(conv.source, 'google');
  const sector = await p.evaluate(() => fromGoogle([{ address_components: [
    { long_name: 'Unnamed Road', types: ['route'] }, { long_name: 'Sector 12', types: ['political', 'sublocality', 'sublocality_level_2'] },
    { long_name: 'Kharghar', types: ['political', 'sublocality', 'sublocality_level_1'] }, { long_name: 'Navi Mumbai', types: ['locality', 'political'] } ] }]));
  assert.deepStrictEqual(sector.address, { suburb: 'Kharghar', neighbourhood: 'Sector 12', city: 'Navi Mumbai' }, 'an unnamed road is dropped');
  assert.strictEqual(await p.evaluate(s => routeAuthority(s.address).id, sector), 'pmc');
  assert.strictEqual(await p.evaluate(() => fromGoogle([])), null);
  assert.strictEqual(await p.evaluate(() => fromGoogle([{ address_components: [{ long_name: 'Mumbai', types: ['locality'] }, { long_name: 'Andheri West', types: ['sublocality', 'sublocality_level_1'] }, { long_name: 'Mumbai Suburban', types: ['administrative_area_level_3'] }] }]).address).then(a => p.evaluate(x => routeAuthority(x).to[0], a)), 'ac.kw@mcgm.gov.in');

  // with a Maps key: Google names the place, OpenStreetMap is not asked, and the attribution shows
  const g = await ctx.newPage(); g.on('pageerror', e => errs.push(e.message));
  osmCalls = 0; sent = null;
  await g.goto('https://khadda.test/g');
  await g.setInputFiles('#gallery', { name: 'p.png', mimeType: 'image/png', buffer: Buffer.from(PHOTO, 'base64') });
  await g.waitForFunction(() => document.getElementById('send').textContent === 'Send from my Gmail');
  assert(/key=test-key/.test(mapsUrl) && /callback=__khaddaMaps/.test(mapsUrl) && /loading=async/.test(mapsUrl));
  assert.deepStrictEqual(await g.evaluate(() => window.__geoReq.location), { lat: 19.0473, lng: 73.0699 });
  assert.strictEqual(osmCalls, 0, 'Nominatim is not called when Google answers');
  const gPlace = await g.textContent('#place'); console.log(gPlace);
  assert(/^Shivaji Road, Old Panvel, Panvel 410206/.test(gPlace)); assert(/Powered by Google/.test(gPlace));
  assert(/^Pothole needing repair: Shivaji Road, Old Panvel \(/.test(await g.inputValue('#subject')));
  assert(/Location: Shivaji Road, Old Panvel, Panvel 410206\n/.test(await g.inputValue('#bodyText')));
  assert(/Panvel Municipal Corporation/.test(await g.textContent('#authority')));
  await g.evaluate(() => { document.getElementById('edit').open = true; });
  assert.strictEqual(await g.inputValue('#areaName'), 'Old Panvel');
  await g.click('#send'); await g.click('#confirmSend');
  await g.waitForFunction(() => document.getElementById('send').textContent === 'Sent');
  const kept = await g.evaluate(() => JSON.parse(localStorage.getItem('khadda.history')));
  assert.strictEqual(kept[0].place, '19.04730, 73.06990', 'a Google-named place is remembered by coordinates only');
  assert(/Kharghar/.test(kept[1].place), 'an OpenStreetMap-named place keeps its words');
  await g.close();

  // a refused key or a script that will not load falls back to OpenStreetMap without a fuss
  for (const mode of ['denied', 'fail']) {
    mapsMode = mode; osmCalls = 0;
    const f = await ctx.newPage(); f.on('pageerror', e => errs.push(e.message));
    await f.goto('https://khadda.test/g');
    await f.setInputFiles('#gallery', { name: 'p.png', mimeType: 'image/png', buffer: Buffer.from(PHOTO, 'base64') });
    await f.waitForFunction(() => document.getElementById('send').textContent === 'Send from my Gmail');
    assert.strictEqual(osmCalls, 1, mode);
    const fPlace = await f.textContent('#place');
    assert(/^Sion-Panvel Highway, Sector 5, Kharghar, Navi Mumbai/.test(fPlace), mode); assert(!/Powered by Google/.test(fPlace), mode);
    await f.close();
  }
  console.log('errors', errs); await b.close(); console.log('PASS');
})().catch(e => { console.error(e); process.exit(1); });
