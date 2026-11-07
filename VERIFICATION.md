# Getting Khadda verified by Google

Status: brand verification passed and published on 5 November 2026. Scope review submitted the same day. On 7 November Google asked for three things: a video in which the consent screen shows the scope fully expanded and readable, a privacy policy that says with whom Google user data is shared, and one that describes how sensitive data is protected. The privacy policy was updated the same day. The video must be re-recorded with the consent screen expanded, then the owner replies to Google's email with the new video link and the privacy policy link, and resubmits in the Cloud Console.

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

Record the phone screen with the microphone on, upload to YouTube as Unlisted, and paste the link in the form. No face or name on camera is needed. Aim for two to three minutes. Reviewers don't mind rough.

Before recording: turn on Do Not Disturb, open https://khadda.in in Chrome, save your name under "Your details", take a throwaway photo so you can set the authority to "Someone else" with your own address, then tap "Start a new report". Open the Gmail app once, and open https://console.cloud.google.com/auth/clients with Khadda selected in another tab. Never let the recording send to a real office.

1. Home page, about 25 seconds. With khadda.in in the address bar, say what Khadda is: a web page for reporting potholes to the responsible municipal authority, which sends the complaint from the person's own Gmail with the photo attached. Scroll to the footer, read the Gmail line, tap "Privacy policy", pause on it and name the URL, then go back.
2. Photo, about 20 seconds. Tap "Click the pothole", take a photo, and say the page is getting the GPS position and looking up the address and the authority. Wait until Send reads "Send from my Gmail".
3. Email, about 25 seconds. Open "Check or change the email". Show the recipient, subject and message. Say the recipient is set to your own address for the demo and is normally the municipal corporation.
4. Send, about 10 seconds. Tap "Send from my Gmail", pause on the confirm line, say the page asks you to confirm the recipient, tap "Yes, send it".
5. Consent, about 20 seconds. If the unverified-app screen appears, tap Continue. Pause three seconds on the consent screen. Say the app name is Khadda and the only permission is to send email on your behalf, the gmail.send scope, which cannot read mail or change anything. Allow.
6. Result, about 10 seconds. Show the "Sent to" message. Say the token was used once in the browser, is never stored, and there is no server.
7. Gmail, about 15 seconds. Open the Gmail Sent folder and the email, scroll to the attachment. Say this is the only thing Khadda does with the permission.
8. Client ID, about 10 seconds. Switch to the Google Cloud client tab, show the client ID for three seconds, stop recording.

## 6. Submit

At https://console.cloud.google.com/auth/audience, tap "Publish app" to move from Testing to In production, then at https://console.cloud.google.com/auth/verification tap "Prepare for verification". Fill the justification and video link, confirm the privacy policy and homepage URLs, and submit. Watch the inbox of the developer contact address for questions from Google's Trust and Safety team. Replying by email within the thread is enough.

## If Google asks for a security assessment

It should not, because gmail.send is sensitive rather than restricted. If the reply says otherwise, answer that the app requests only gmail.send, runs entirely on the user's device, and stores or transmits no Google user data on any server.
