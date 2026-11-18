# Fill the athletes template with all competition competitors

This is a one-off file. The app doesn't change.

## What you'll get
A filled copy of your `athletes_template.csv`, with your example rows removed and one row for each of the 26 active competitors (rejected, cancelled and refunded entries left out). It is saved to Files so you can download it.

| Column | Filled with |
|---|---|
| name | Full name, e.g. `ETHAN BONDARENKO` |
| dob | Date of birth as YYYY-MM-DD, as the template shows |
| gender | male / female |
| rank_kind | `geup` for coloured belts, `dan` for Poom/Dan |
| rank_value | Geup number (e.g. 4). Left blank for Poom/Dan, because the exact Poom/Dan number isn't recorded |
| categories | Each event they entered, joined with `\|`, e.g. `Taegeuk 8 Jang\|Koryo` |
| team | Club name, all in capitals (e.g. `GAONHAE TAEKWONDO`, `POON TKD`) |

## Notes
- A few competitors entered an event at a different belt from their own grade (e.g. Iqraa, Stella, Imran). Their rank shows the grade they registered with, and categories shows the events they entered.
- After creating the file, I'll check it has 26 rows and every field is filled in.
