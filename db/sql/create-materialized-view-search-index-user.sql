
CREATE MATERIALIZED VIEW IF NOT EXISTS search_index.user AS
  SELECT id, user_name, display_name, description, num_followers
  FROM public.user u
  LEFT JOIN (
    SELECT target_id, COUNT(*) ::int AS num_followers
    FROM action_user
    GROUP BY 1
  ) t ON target_id=u.id ;

CREATE UNIQUE INDEX IF NOT EXISTS search_user_id_index ON search_index.user (id) ;
CREATE UNIQUE INDEX IF NOT EXISTS search_user_name_index ON search_index.user (user_name) ;
CREATE INDEX IF NOT EXISTS search_user_display_name_index ON search_index.user (display_name) ;

REFRESH MATERIALIZED VIEW CONCURRENTLY search_index.user ;
