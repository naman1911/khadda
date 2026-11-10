# Khadda

Phone-first web page for reporting potholes. The person photographs a pothole. The page gets the location, picks the responsible authority, drafts the complaint, and sends it from the person's own Gmail with the photo attached. "Khadda" means pothole in Hindi and Marathi.

## Files

- `index.html`: the whole app. No build step, backend, or database.
- `tests/e2e.test.js`: routing checks and a full flow with simulated services.
- `AUTHORITY_CONTACTS.md`: every address in the app, including elected representatives, with its source and confidence.
- `privacy.html`: the privacy policy Google's verification requires, linked from the footer of `index.html`.
- `VERIFICATION.md`: steps, justification text and video script for Google's OAuth verification.

## How it works

1. The camera button starts a GPS fix and opens the camera with `capture="environment"`.
2. Nominatim turns the coordinates into an address. Overpass checks for a road with an NH or SH reference within 30 m.
3. `routeAuthority()` checks address fields from smallest area to largest and picks the authority.
4. `draft()` writes the subject and body. The person can edit them, or change the authority, under "Check or change the email".
5. Send first shows the recipient and asks for a confirm tap. Then `buildMime()` builds the email, Google Identity Services gets a `gmail.send` token in the browser, and the page calls the Gmail API.
6. If `GOOGLE_CLIENT_ID` is empty, Send uses the share sheet instead: the address goes to the clipboard, and the person pastes it into Gmail.

## Rules to keep

- Never match authorities on the road name. "Sion-Panvel Highway" runs through Vashi and "Thane-Belapur Road" through Airoli.
- Kharghar, Kamothe, Kalamboli and Taloja belong to Panvel even when the geocoder says Navi Mumbai, so suburb fields are checked before city.
- `state_district` only counts for Mumbai. Thane district also contains Navi Mumbai and Kalyan.
- If no authority matches, ask for an address. Never guess a recipient.
- The Chief Minister's Office is copied on every real complaint. A "Someone else" address copies nobody, so tests reach only the owner. MP and MLA copies were removed on 10 November 2026 at the owner's request; the suburb-to-seat map, `findSeats()` and the `MPS` table are in git history (commit ff11d4f onwards) and the verified MP addresses stay in `AUTHORITY_CONTACTS.md` if they are wanted back.
- For a photo from the gallery, use its EXIF GPS first. If it has none, use current GPS and warn the person.
- Never say an email was sent unless the Gmail API returned success.
- Do not store the Google token. Details stay in `localStorage` on the phone. The only outside services are Nominatim, Overpass, Google and Google Fonts.
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

Not yet tested:
- The share sheet flow.
- Routing at Kharghar, Vashi, Andheri West and Thane with live Nominatim data.

## What to do next

1. The code is on `main` in `naman1911/khadda`, served by GitHub Pages at `https://khadda.in/` through the `CNAME` file. The old `https://naman1911.github.io/khadda/` address redirects there.
2. The Google OAuth client exists in the owner's Google Cloud project "Khadda", with the Gmail API enabled and the client ID in `GOOGLE_CLIENT_ID`. A client ID is public by design. Never add a client secret. The app is verified, so anyone with a Google account can send through Gmail.
3. Test on a phone by sending to the owner's own address.
4. Log real Nominatim responses from a few known spots and correct the routing. Try Kharghar, Vashi, Andheri West and Thane.

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
