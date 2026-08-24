# Thalify web/TWA security notes

## Public-code boundary

This repository is intentionally public because it is delivered through GitHub Pages. Treat every URL, JavaScript value, HTML file and browser-side configuration in this repository as public.

Never commit provider API keys, Cloudflare secrets, signing keys, passwords, private tokens or user data. AI-provider credentials belong only in server-side Worker secrets. The public Worker URL is an address, not a secret, and the Worker must enforce its own validation, quotas and abuse controls.

## Browser data

The web/TWA stores profile, nutrition, activity and preference data in browser storage. Avoid adding third-party scripts to the production origin without review: a same-origin script vulnerability could expose browser-local records. Keep test benches and experimental pages off the production Pages origin.

## Barcode and network behavior

Where the browser provides BarcodeDetector, package frames are processed locally and only the decoded barcode value is sent to Open Food Facts. Browsers without that API use manual barcode entry in the production TWA. Do not add a remote camera-decoder script without dependency, privacy and supply-chain review.

## Reporting

Report suspected security or privacy issues privately to thalify.admin@gmail.com. Do not include real user health or nutrition data in a public GitHub issue.
