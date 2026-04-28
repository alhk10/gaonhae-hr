## Move footer down 1cm

In `src/utils/gradingCertificatePDFGenerator.ts`, change `footerY` from `200` to `210`.

This shifts the entire footer block (WT/Kukkiwon logos, "In Affiliation With" text, and master signature) down by 10mm (1cm), since all footer Y-coordinates are derived from `footerY`.

No other coordinates change.