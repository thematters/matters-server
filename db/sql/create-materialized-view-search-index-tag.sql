
CREATE MATERIALIZED VIEW IF NOT EXISTS search_index.tag AS
  SELECT id, content, description, num_articles, num_authors, num_followers
  FROM public.tag
  LEFT JOIN (
    SELECT target_id, COUNT(*) ::int AS num_followers
    FROM action_tag
    GROUP BY 1
  ) actions ON target_id=tag.id
  LEFT JOIN (
    SELECT tag_id, COUNT(*)::int AS num_articles, COUNT(DISTINCT author_id) ::int AS num_authors
    FROM article_tag JOIN article ON article_id=article.id
    GROUP BY 1
  ) at ON tag_id=tag.id;

CREATE UNIQUE INDEX IF NOT EXISTS search_tag_id_index ON search_index.tag (id) ;
CREATE UNIQUE INDEX IF NOT EXISTS search_tag_name_index ON search_index.tag (content) ;
-- CREATE INDEX IF NOT EXISTS search_tag_display_name_index ON search_index.tag (display_name) ;

REFRESH MATERIALIZED VIEW CONCURRENTLY search_index.tag ;
