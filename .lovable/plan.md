# Pin Gaonhae Arm, Shin & Groin Protector Set first

## Change

Update the `get_public_chat_products_for_student` RPC ordering so any product whose name starts with "Gaonhae " sorts before others. Secondary order remains alphabetical by name.

```sql
ORDER BY
  (p.name ILIKE 'Gaonhae %') DESC,
  p.name ASC
```

This pins Gaonhae-branded items (including the Arm, Shin & Groin Protector Set) to the top of every product picker in `/hello`, while keeping the rest A–Z.

## Out of scope

- Per-category custom ordering or admin-controlled sort.
- Changes to other product list RPCs (invoice editor, student portal).
