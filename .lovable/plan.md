## Problem

Henry, Teo, Zuhayr, Elliot, Kalli, Daniel and Iqraa all have completed scorecards and a result, but they don't appear in **Ready for Printing**.

I checked their `grading_registrations.scorecard` data:

- All seven have **Height, Weight, Poomsae, and Balchagi** filled in, plus a `result` of `pass`.
- None of them have a `Kyorugi` value (the field is either absent or filled with `-`).

The current filter requires Kyorugi specifically:

```ts
const SCORECARD_REQUIRED_REGEXES = [/height/i, /weight/i, /poomsae/i, /kyorugi/i];
```

But for lower belts (Foundation → Yellow Tip → Yellow), the sparring assessment is **Balchagi**, not Kyorugi. Higher belts use Kyorugi. They're alternatives — only one is expected per student depending on belt level.

## Fix

Update `getCompleteness` in both grading list components to require:

- Height, Weight, Poomsae (always)
- **Either** Kyorugi **or** Balchagi (whichever the scorecard has)
- A non-null `result`

```ts
const SCORECARD_REQUIRED_REGEXES = [/height/i, /weight/i, /poomsae/i];
const SPARRING_REGEXES = [/kyorugi/i, /balchagi/i];

const getCompleteness = (s) => {
  const allFilled =
    SCORECARD_REQUIRED_REGEXES.every(rx => isScorecardFieldFilled(s.scorecard, rx)) &&
    SPARRING_REGEXES.some(rx => isScorecardFieldFilled(s.scorecard, rx));
  return { allFilled, hasResult: !!s.result };
};
```

After this, the seven students will move into **Ready for Printing**, and **Missing Details** will only flag students truly missing a sparring score.

## Files to edit

- `src/components/dashboard/BranchGradingList.tsx`
- `src/components/sales/GradingListTab.tsx`

Approve to switch to default mode and apply.