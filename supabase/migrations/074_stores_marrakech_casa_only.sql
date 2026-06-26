-- Limiter les magasins actifs à Marrakech et Casablanca

UPDATE stores
SET is_active = false
WHERE city NOT IN ('Marrakech', 'Casablanca');
