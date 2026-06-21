-- Un seul créneau par caissier et par jour (même magasin ou horaire différent)

DELETE FROM cashier_shifts a
USING cashier_shifts b
WHERE a.cashier_id = b.cashier_id
  AND a.shift_date = b.shift_date
  AND a.created_at > b.created_at;

ALTER TABLE cashier_shifts
  DROP CONSTRAINT IF EXISTS cashier_shifts_one_per_day;

ALTER TABLE cashier_shifts
  ADD CONSTRAINT cashier_shifts_one_per_day UNIQUE (cashier_id, shift_date);

NOTIFY pgrst, 'reload schema';
