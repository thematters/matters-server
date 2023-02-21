
-- drop & replace the table if exists
DROP TABLE IF EXISTS search_index.user ;

CREATE TABLE IF NOT EXISTS search_index.user AS
  SELECT id, user_name, lower(trim(leading '@＠ ' from display_name)) AS display_name,
    display_name AS display_name_orig,
    description, state, created_at, num_followers, last_followed_at
  FROM public.user u
  LEFT JOIN (
    SELECT target_id, COUNT(*) ::int AS num_followers,
      MAX(created_at) AS last_followed_at
    FROM action_user
    GROUP BY 1
  ) t ON target_id=u.id
  WHERE state IN ('active', 'onboarding')
  ORDER BY last_followed_at DESC NULLS LAST, u.id DESC
  LIMIT 10000
;

ALTER TABLE search_index.user ADD PRIMARY KEY (id), ALTER COLUMN user_name SET NOT NULL, ALTER COLUMN state SET NOT NULL ;
-- CREATE UNIQUE INDEX IF NOT EXISTS search_user_id_index ON search_index.user (id) ;

ALTER TABLE search_index.user ADD COLUMN display_name_ts tsvector GENERATED ALWAYS AS (to_tsvector('chinese_zh', display_name)) STORED ;
ALTER TABLE search_index.user ADD COLUMN IF NOT EXISTS indexed_at timestamptz DEFAULT CURRENT_TIMESTAMP ;

-- CREATE UNIQUE INDEX IF NOT EXISTS search_user_name_index ON search_index.user (user_name) ;
CREATE INDEX IF NOT EXISTS search_index_user_name_index ON search_index.user (user_name) ;
CREATE INDEX IF NOT EXISTS search_index_user_display_name_index ON search_index.user (display_name) ;
CREATE INDEX IF NOT EXISTS search_index_user_display_name_ts_gin_idx ON search_index.user USING GIN (display_name_ts) ;
