# Getting Khadda verified by Google

Khadda asks for one Google permission, `https://www.googleapis.com/auth/gmail.send`. Google classes it as a sensitive scope, not a restricted one, so verification needs a review with a justification and a demo video, and no paid security assessment. Google says the review takes up to about 10 days, often with one or two rounds of emailed questions.

Until verification is done, only listed test users can send through Gmail, and everyone sees the "Google hasn't verified this app" screen.

## 1. The domain

The site's domain is khadda.in. The `CNAME` file in the repo tells GitHub Pages to serve it there, and the old github.io address redirects to it.

1. At the registrar's DNS settings, add four A records for the bare domain (host `@`), each with TTL left at the default, pointing at `185.199.108.153`, `185.199.109.153`, `185.199.110.153` and `185.199.111.153`. Add a CNAME record with host `www` and value `naman1911.github.io`.
2. Wait for DNS to spread, usually under an hour. Then at https://github.com/naman1911/khadda/settings/pages, check that "Custom domain" shows khadda.in with a green tick, and tick "Enforce HTTPS" once the box becomes available. GitHub needs a few minutes to issue the certificate.
3. At https://search.google.com/search-console, add a "Domain" property for khadda.in and verify it with the TXT record it gives you, added at the registrar as host `@`. Use the same Google account that owns the Cloud project.
4. At https://console.cloud.google.com/auth/clients, open Khadda and add `https://khadda.in` as a second authorized JavaScript origin. Keep the github.io one.

## 2. Branding page in Google Cloud

At https://console.cloud.google.com/auth/branding, fill in:

- App name: Khadda
- User support email: your address
- App logo: leave empty. A logo triggers a separate brand review and adds nothing.
- App home page: `https://khadda.in/`
- Privacy policy link: `https://khadda.in/privacy.html`
- Terms of service: leave empty, it is optional.
- Authorized domains: khadda.in
- Developer contact: your address

## 3. Data access page

At https://console.cloud.google.com/auth/scopes, make sure the only scope listed is `https://www.googleapis.com/auth/gmail.send`.

## 4. Scope justification

Paste this into the justification box for the gmail.send scope:

> Khadda is a single web page for reporting potholes to the municipal authority responsible for the road. The user photographs the pothole, the page finds the location and the authority, and drafts a complaint email with the photo attached. The user reviews the recipient, subject and text, confirms, and the page sends that one email from the user's own Gmail account using gmail.send, so that the authority's reply reaches the user directly and a copy is in their Sent folder.
>
> gmail.send is the narrowest scope that can send an email. The page does not read, list, modify or delete any mail, so gmail.readonly, gmail.modify, gmail.compose and mail.google.com are not requested. There is no server: the page runs entirely in the browser, the access token is held only in memory for the duration of the send, and no Google user data is stored or transmitted anywhere except to the Gmail API for that one send.

## 5. Demo video

Record your phone screen, upload to YouTube as Unlisted, and paste the link in the form. Keep it under about three minutes. Narrate or add captions. Show these things in order:

1. Open `https://khadda.in/` so the address bar and the homepage are visible. Scroll to the footer so the Gmail explanation and the Privacy policy link appear.
2. Tap "Click the pothole" and take a photo. Let the location and "Sending to" lines fill in.
3. Open "Check or change the email" so the recipient, subject and body are visible.
4. Tap "Send from my Gmail". Show the confirm line, then tap "Yes, send it".
5. Google's consent screen appears. Pause on it so the app name "Khadda" and the permission "Send email on your behalf" are readable. Allow it.
6. Show the "Sent to …" message on the page.
7. Open Gmail and show the email in the Sent folder with the photo attached.
8. Open https://console.cloud.google.com/auth/clients, tap Khadda, and show the client ID on screen. Google asks that the video shows the client ID.

For this recording, set the authority to "Someone else" and your own address, so no real office gets a test email.

## 6. Submit

At https://console.cloud.google.com/auth/audience, tap "Publish app" to move from Testing to In production, then at https://console.cloud.google.com/auth/verification tap "Prepare for verification". Fill the justification and video link, confirm the privacy policy and homepage URLs, and submit. Watch the inbox of the developer contact address for questions from Google's Trust and Safety team. Replying by email within the thread is enough.

## If Google asks for a security assessment

It should not, because gmail.send is sensitive rather than restricted. If the reply says otherwise, answer that the app requests only gmail.send, runs entirely on the user's device, and stores or transmits no Google user data on any server.
