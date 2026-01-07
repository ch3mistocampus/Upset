-- Calculate fighter records from ufc_fights table
-- This updates record_wins, record_losses, record_draws, and record_nc

-- Update records for all fighters based on fight results
WITH fight_records AS (
  SELECT
    fighter_id,
    SUM(CASE WHEN winner = TRUE THEN 1 ELSE 0 END) as wins,
    SUM(CASE WHEN loser = TRUE THEN 1 ELSE 0 END) as losses,
    SUM(CASE WHEN is_draw = TRUE THEN 1 ELSE 0 END) as draws,
    SUM(CASE WHEN is_nc = TRUE THEN 1 ELSE 0 END) as nc
  FROM (
    -- Red corner fighters
    SELECT
      f.red_fighter_id as fighter_id,
      f.winner_fighter_id = f.red_fighter_id as winner,
      f.loser_fighter_id = f.red_fighter_id as loser,
      f.result_method ILIKE '%draw%' as is_draw,
      f.result_method ILIKE '%no contest%' OR f.result_method ILIKE '%NC%' as is_nc
    FROM public.ufc_fights f
    WHERE f.red_fighter_id IS NOT NULL

    UNION ALL

    -- Blue corner fighters
    SELECT
      f.blue_fighter_id as fighter_id,
      f.winner_fighter_id = f.blue_fighter_id as winner,
      f.loser_fighter_id = f.blue_fighter_id as loser,
      f.result_method ILIKE '%draw%' as is_draw,
      f.result_method ILIKE '%no contest%' OR f.result_method ILIKE '%NC%' as is_nc
    FROM public.ufc_fights f
    WHERE f.blue_fighter_id IS NOT NULL
  ) fight_participation
  GROUP BY fighter_id
)
UPDATE public.ufc_fighters uf
SET
  record_wins = COALESCE(fr.wins, 0),
  record_losses = COALESCE(fr.losses, 0),
  record_draws = COALESCE(fr.draws, 0),
  record_nc = COALESCE(fr.nc, 0),
  updated_at = NOW()
FROM fight_records fr
WHERE uf.fighter_id = fr.fighter_id;

-- Create a function to recalculate records (for manual triggers)
CREATE OR REPLACE FUNCTION public.recalculate_fighter_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  WITH fight_records AS (
    SELECT
      fighter_id,
      SUM(CASE WHEN winner = TRUE THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN loser = TRUE THEN 1 ELSE 0 END) as losses,
      SUM(CASE WHEN is_draw = TRUE THEN 1 ELSE 0 END) as draws,
      SUM(CASE WHEN is_nc = TRUE THEN 1 ELSE 0 END) as nc
    FROM (
      SELECT
        f.red_fighter_id as fighter_id,
        f.winner_fighter_id = f.red_fighter_id as winner,
        f.loser_fighter_id = f.red_fighter_id as loser,
        f.result_method ILIKE '%draw%' as is_draw,
        f.result_method ILIKE '%no contest%' OR f.result_method ILIKE '%NC%' as is_nc
      FROM public.ufc_fights f
      WHERE f.red_fighter_id IS NOT NULL

      UNION ALL

      SELECT
        f.blue_fighter_id as fighter_id,
        f.winner_fighter_id = f.blue_fighter_id as winner,
        f.loser_fighter_id = f.blue_fighter_id as loser,
        f.result_method ILIKE '%draw%' as is_draw,
        f.result_method ILIKE '%no contest%' OR f.result_method ILIKE '%NC%' as is_nc
      FROM public.ufc_fights f
      WHERE f.blue_fighter_id IS NOT NULL
    ) fight_participation
    GROUP BY fighter_id
  )
  UPDATE public.ufc_fighters uf
  SET
    record_wins = COALESCE(fr.wins, 0),
    record_losses = COALESCE(fr.losses, 0),
    record_draws = COALESCE(fr.draws, 0),
    record_nc = COALESCE(fr.nc, 0),
    updated_at = NOW()
  FROM fight_records fr
  WHERE uf.fighter_id = fr.fighter_id;
END;
$$;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION public.recalculate_fighter_records() TO service_role;
