
-- drop & replace the table if exists
DROP TABLE IF EXISTS search_index.tag ;

CREATE TABLE IF NOT EXISTS search_index.tag AS
  SELECT id, lower(trim(both '#＃ ' from content)) AS content, content AS content_orig, -- to be filled later with opencc conversion
    description, created_at, num_articles, num_authors, num_followers, last_followed_at -- , NOW() AS indexed_at
  FROM public.tag
  LEFT JOIN (
    SELECT target_id, COUNT(*) ::int AS num_followers,
      MAX(created_at) AS last_followed_at
    FROM action_tag
    GROUP BY 1
  ) actions ON target_id=tag.id
  LEFT JOIN (
    SELECT tag_id, COUNT(*)::int AS num_articles, COUNT(DISTINCT author_id) ::int AS num_authors
    FROM article_tag JOIN article ON article_id=article.id
    GROUP BY 1
  ) at ON tag_id=tag.id

  WHERE tag.id NOT IN ( SELECT UNNEST( array_remove(dup_tag_ids, id) ) FROM mat_views.tags_lasts WHERE ARRAY_LENGTH(dup_tag_ids,1)>1 )
  ORDER BY last_followed_at DESC NULLS LAST, tag.id DESC
  LIMIT 10000
;

ALTER TABLE search_index.tag ADD PRIMARY KEY (id), ALTER COLUMN content SET NOT NULL ;
-- CREATE UNIQUE INDEX IF NOT EXISTS search_tag_id_index ON search_index.tag (id) ;

ALTER TABLE search_index.tag ADD COLUMN content_ts tsvector GENERATED ALWAYS AS (to_tsvector('chinese_zh', content)) STORED ;
ALTER TABLE search_index.tag ADD COLUMN IF NOT EXISTS indexed_at timestamptz DEFAULT CURRENT_TIMESTAMP ;

CREATE INDEX IF NOT EXISTS search_index_tag_name_index ON search_index.tag (content) ;
 -- supposed to be Unique, but old table already has exact duplicates
CREATE INDEX IF NOT EXISTS search_index_tag_name_orig_index ON search_index.tag (content_orig) ;
CREATE INDEX IF NOT EXISTS search_index_tag_content_ts_gin_idx ON search_index.tag USING GIN (content_ts) ;
