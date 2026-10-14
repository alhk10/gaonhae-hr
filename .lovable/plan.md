# Reintegrate the original 4 Instagram squares

## Problem
The first set of 4 Instagram squares (`perth-2026-instagram-1-event.png`, `-2-poomsae-seminar.png`, `-3-kyorugi-seminar.png`, `-4-poomsae-competition.png`) was generated to temporary paths and never persisted to Files, so they no longer exist. The v2 set (with the Gaonhae logo and masters' faces) is saved in Files.

## Plan
1. Check whether the v1 originals still exist anywhere on disk (temp/image-gen folders). If found, copy them into Files under their original names.
2. If not found, regenerate the v1 designs (generic taekwondo figures, no logo/faces) directly into Files with the original filenames:
   - Square 1: Date & time, venue & event overview
   - Square 2: Poomsae Seminar
   - Square 3: Kyorugi Seminar
   - Square 4: Poomsae Competition
3. Keep the v2 set (logo + masters' faces) untouched in Files alongside them.
4. Visually inspect all 4 restored squares for correct details (dates, times, prices, venue, deadline) before delivering.

## Result
Files will contain both sets: the original v1 squares under their original names, and the v2 logo/faces versions (`..._v2.png`).
