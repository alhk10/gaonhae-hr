import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parseAnextAlert } from "./parse.ts";

const SAMPLE = "Transaction Ref: 20261111122338001929648523661  Dear Valued Customer,  You have received SGD370.60 on 11/11/2026 12:23(SGT) from THEI NWE MYET SHU HTWE to your account ending 7649 via PAYNOW. Need help? Get in touch";

Deno.test("parses the ANEXT sample alert", () => {
  assertEquals(parseAnextAlert(SAMPLE), {
    txn_ref: "20261111122338001929648523661", amount: 370.6, currency: "SGD",
    received_at: "2026-11-11T12:23:00+08:00", payer_name: "THEI NWE MYET SHU HTWE",
    account_last4: "7649", method: "PAYNOW",
  });
});

Deno.test("parses FAST with thousands separator", () => {
  const t = parseAnextAlert("Transaction Ref: 123456789012 You have received SGD1,250.00 on 01/12/2026 09:05(SGT) from TAN AH KOW to your account ending 7649 via FAST.");
  assertEquals(t?.amount, 1250);
  assertEquals(t?.method, "FAST");
});

Deno.test("ignores other bank emails", () => {
  assertEquals(parseAnextAlert("Sweet! You have received SGD 2100.00 from Standard Chartered Bank A/C ending 2350 on 12 Nov 2026 09:16 SGT."), null);
});
