# Khadda

Phone-first web page for reporting potholes. The person photographs a pothole. The page gets the location, picks the responsible authority, drafts the complaint, and sends it from the person's own Gmail with the photo attached. "Khadda" means pothole in Hindi and Marathi.

## Files

- `index.html`: the whole app. No build step, backend, or database.
- `tests/e2e.test.js`: routing checks and a full flow with simulated services.
- `AUTHORITY_CONTACTS.md`: every address in the app, including elected representatives, with its source and confidence.
- `privacy.html`: the privacy policy Google's verification requires, linked from the footer of `index.html`.
- `VERIFICATION.md`: steps, justification text and video script for Google's OAuth verification.

## How it works

1. The camera button starts a GPS fix and opens the camera with `capture="environment"`. `requestFix()` watches the position for up to six seconds after the first fix and keeps the most accurate one, stopping early under 25 m.
2. The coordinates become a written address. If `GOOGLE_MAPS_KEY` is set, `googleReverse()` asks Google's geocoder through the Maps JavaScript API and `fromGoogle()` turns the result into the same address shape Nominatim gives; any failure falls back to Nominatim. With no key, Nominatim is used. One Overpass query returns the administrative boundaries (admin_level 8 to 10) and named places whose polygons contain the pin, any road with an NH or SH reference within 30 m, place labels within 2 km, and named landmarks within 80 m. The query is four plain statements, each with its own `out`. `parseOverpass()` sorts that out.
3. `routeAll()` picks the authority: a containing admin_level 8 boundary whose name matches `BOUNDARY_AUTHORITY` wins; otherwise `routeAuthority()` checks address fields from smallest area to largest. For BMC, the ward comes from the suburb table or from a level 9 or 10 boundary named like "K/West".
4. `areaFrom()` picks the area name for the subject. A Google address is trusted as it is: its sub-locality is the area, its second-level sub-locality the sector, and its pin code is added to the Location line. For an OpenStreetMap address the order is: a place polygon containing the pin, else Nominatim's suburb unless another place label is clearly closer (under 60% of the distance), else the nearest label. A town label that is clearly nearer than any suburb label makes the town the area, which is how a pin in old Panvel reads "Panvel" and not "New Panvel". `hoodFrom()` picks the sector the same way and drops one whose label is over 800 m away. `landmarkFrom()` gives the nearest named landmark, with banks, schools, stations and similar preferred over small shops; it goes in the body as "Nearest landmark" and in the subject when there is no road name. The person can retype the area or tap one of the nearby names under "Check or change the email", and the subject and body follow. "Copy location details" puts the coordinates and the raw map answers on the clipboard for fixing the tables.
5. `draft()` writes the subject and body. The person can edit them, or change the authority, under "Check or change the email".
6. Send first shows the recipient and asks for a confirm tap. Then `buildMime()` builds the email, Google Identity Services gets a `gmail.send` token in the browser, and the page calls the Gmail API.
7. If `GOOGLE_CLIENT_ID` is empty, Send uses the share sheet instead: the address goes to the clipboard, and the person pastes it into Gmail.

## Rules to keep

- The written address must never claim more than the map shows. If a name is not clearly right, leave it out; the coordinates and map link carry the exact spot. Only Google's pin codes are used, because OpenStreetMap's are unreliable in this region.
- Google's geocoder terms: show "Powered by Google" wherever its address appears on the page, and never store its address text. `remember()` keeps only coordinates for a Google-named spot. Do not call the plain `maps.googleapis.com/maps/api/geocode/json` endpoint from the page; it refuses site-restricted keys.
- `GOOGLE_MAPS_KEY` is public like the client ID, so its safety is its restrictions in Google Cloud: HTTP referrer `https://khadda.in/*`, API restrictions to Maps JavaScript API and Geocoding API, and a daily quota cap on the Geocoding API. It is an API key, not part of the OAuth consent screen, so it does not affect the verification.
- Never match authorities on the road name. "Sion-Panvel Highway" runs through Vashi and "Thane-Belapur Road" through Airoli.
- Kharghar, Kamothe, Kalamboli and Taloja belong to Panvel even when the geocoder says Navi Mumbai, so suburb fields are checked before city.
- `state_district` only counts for Mumbai. Thane district also contains Navi Mumbai and Kalyan.
- If no authority matches, ask for an address. Never guess a recipient.
- The Chief Minister's Office is copied on every real complaint. A "Someone else" address copies nobody, so tests reach only the owner. MP and MLA copies were removed on 10 November 2026 at the owner's request; the suburb-to-seat map, `findSeats()` and the `MPS` table are in git history (commit ff11d4f onwards) and the verified MP addresses stay in `AUTHORITY_CONTACTS.md` if they are wanted back.
- For a photo from the gallery, use its EXIF GPS first. If it has none, use current GPS and warn the person.
- Never say an email was sent unless the Gmail API returned success.
- Do not store the Google token. Details stay in `localStorage` on the phone. The only outside services are Nominatim, Overpass, Google (sign-in, Gmail and Maps geocoding) and Google Fonts.
- Do not send test emails to real authorities. Test by sending to yourself with "Someone else" in the authority list.
- Copy is plain and warm, with no em-dashes.

## Current status

Done:
- The app is written, and `tests/e2e.test.js` passes with simulated services.
- Tested on a real phone on 4 November 2026 at Nerul East. Real GPS, live Nominatim, routing to NMMC, and real Gmail sending with the photo, coordinates and map link all worked.
- Google approved the OAuth verification for gmail.send on 10 November 2026, five days after the first submission and two after the resubmission. The unverified-app screen is gone, anyone with a Google account can send through Khadda, and the test-user list no longer limits who can connect.
- The confirm step was tested on the phone with "Someone else" set to the owner's own address, and the email arrived.
- khadda.in is live over HTTPS on GitHub Pages, verified in Search Console, and set as the home page, privacy policy domain and authorized domain in the Google Cloud project. The app is published, In production, with verified and published branding.
- Google's approval email says a new verification is needed for any new scope or any change to the consent screen configuration (app name, logo, home page, privacy policy link, authorized domains). Code changes, new authorities and copy changes do not need it.

- On 10 November 2026 every authority address was re-checked against official pages. Kalyan Dombivli, Ulhasnagar, Bhiwandi, Ambernath and Badlapur were corrected; see `AUTHORITY_CONTACTS.md`. The same day the location side was strengthened: a better GPS fix, boundary-based routing, an editable area name with nearby suggestions, and a "Copy location details" button. None of this has been tried with live map data yet, because the session that built it could not reach Nominatim or Overpass.

- On 10 November 2026 the owner chose Google's geocoder for the written address. The owner linked a billing account, enabled the Maps JavaScript API and Geocoding API, created the key "Khadda maps", and it was set in `GOOGLE_MAPS_KEY` the same day, so the live page asks Google first. The owner was asked to confirm the key's restrictions (website `https://khadda.in/*`, those two APIs only) and to cap the Geocoding API at 300 requests a day; neither has been confirmed back yet, so ask.

Not yet tested:
- Google's geocoder with a real key and real results. The mapping in `fromGoogle()` assumes sub-locality level 1 is the area and level 2 the sector, which should be checked against "Copy location details" output from Old Panvel, Kharghar and Andheri West once the key is live.
- The share sheet flow.
- The new location code with live Nominatim and Overpass answers. The owner saw "New Panvel" in the subject for a photo taken in Old Panvel; the first job is to take a photo there, tap "Copy location details", and paste the result into the next session so the area and routing tables can be tuned from real data. Then try Kharghar, Vashi, Andheri West and Thane the same way.

## What to do next

1. The code is on `main` in `naman1911/khadda`, served by GitHub Pages at `https://khadda.in/` through the `CNAME` file. The old `https://naman1911.github.io/khadda/` address redirects there.
2. The Google OAuth client exists in the owner's Google Cloud project "Khadda", with the Gmail API enabled and the client ID in `GOOGLE_CLIENT_ID`. A client ID is public by design. Never add a client secret. The app is verified, so anyone with a Google account can send through Gmail.
3. Test on a phone by sending to the owner's own address.
4. Collect "Copy location details" output from a few known spots, Old Panvel first, then Kharghar, Vashi, Andheri West and Thane, and correct the area and routing tables from it.

## Known limits

- The BMC ward list is a hand-written suburb table and may not reflect recent ward splits. Boundary data would be more accurate.
- Panvel taluka villages outside the corporation may match Panvel.
- No verified NHAI or PWD email was found. Highway reports go to the municipality with a request to forward, and the page shows NHAI's 1033 helpline or PWD's PCRS app.
- Nominatim's public service has a usage policy for low volume only. Change geocoder before any large launch.

## Running the tests

```
npm install playwright
npx playwright install chromium
node tests/e2e.test.js
```
