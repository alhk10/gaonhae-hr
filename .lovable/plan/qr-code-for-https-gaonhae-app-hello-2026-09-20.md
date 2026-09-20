# QR code for https://gaonhae.app/hello

Generate a scannable QR code PNG pointing to `https://gaonhae.app/hello` and save it to Files for download.

## What changes

- A high-resolution QR PNG (black on white, error correction level H, generous quiet margin) saved to `/mnt/documents/gaonhae-hello-qr.png` and presented for download.

## Technical detail

- Generate offline with Python `qrcode` at ~1200x1200 px, ECC level H, 4-module quiet zone.
- Verify the rendered QR decodes back to the exact URL before delivering.

No app, database, or code changes.
