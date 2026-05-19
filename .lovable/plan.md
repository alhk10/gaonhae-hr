## Changes to `src/pages/public/PublicGradingList.tsx`

**1. Confirm A4 size** — Both `new jsPDF(...)` calls (lines 277, 497) already use `format: 'a4'`. No change needed; will leave explicit.

**2. Replace hash-based branch colors with fixed mapping**

Replace `BRANCH_PALETTE` + `branchColor()` (lines 248–265) with a name-keyed map (case-insensitive match):

| Branch | Color | Fill RGB | Text RGB |
|---|---|---|---|
| Balmoral | Blue | 219,234,254 | 30,64,175 |
| Kembangan | Green | 220,252,231 | 22,101,52 |
| Jurong West | Yellow | 254,249,195 | 133,77,14 |
| Yishun | Purple | 233,213,255 | 107,33,168 |
| Bukit Merah | Orange | 255,237,213 | 154,52,18 |
| Morley | Teal | 204,251,241 | 17,94,89 |
| Others (default) | Grey | 241,245,249 | 51,65,85 |

`branchColor(name)` looks up by normalized branch name; unmatched → grey.

No other logic changes; existing call sites at lines 418, 557, 621 continue to work.