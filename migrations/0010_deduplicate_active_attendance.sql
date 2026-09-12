WITH ranked_active_attendance AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY session_id, swimmer_id
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS keep_rank
  FROM attendance
  WHERE record_status = 'active'
)
UPDATE attendance
SET record_status = 'inactive'
WHERE id IN (
  SELECT id
  FROM ranked_active_attendance
  WHERE keep_rank > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS attendance_active_session_swimmer_unique
  ON attendance (session_id, swimmer_id)
  WHERE record_status = 'active';