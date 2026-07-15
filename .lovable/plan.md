Implement a small frontend change in the Competitions tab:

1. In the `Grading Card` column, replace the current green ID-card icon/count display with the first uploaded grading card file (`grading_card_urls[0]`) as the thumbnail.
2. Keep the existing click behavior so clicking the thumbnail still opens the grading card upload/manage dialog.
3. If multiple grading card files exist, keep a small count badge over the thumbnail so staff can still see there is more than one file.
4. Keep the existing upload icon when no grading card exists.
5. Handle PDF first files gracefully by showing the existing file/card icon instead of a broken image thumbnail.

Technical detail: update only `src/pages/public/PublicGradingList.tsx` inside `CompetitionsTab`, reusing the existing `SignedImage` component and current `gradingCardDialog` state.