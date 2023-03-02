
-- drop & replace the table if exists
DROP TABLE IF EXISTS search_index.article ;

CREATE TABLE IF NOT EXISTS search_index.article AS
SELECT * FROM (
  SELECT DISTINCT ON (draft.article_id) article.id,
    draft.article_id, draft_id, draft.author_id, draft.title AS title_orig, draft.title AS title, -- to be processed by opencc in JS
    article.slug, draft.summary, draft.content AS content_orig,
    draft.content AS content, '' AS text_content_orig, '' AS text_content, '' AS text_content_converted, -- to be processed by opencc in JS
    draft.created_at, article.state, draft.publish_state
  FROM draft JOIN article ON article_id=article.id AND article_id IS NOT NULL
  WHERE state='active' AND publish_state='published'
  ORDER BY draft.article_id DESC NULLS LAST
) a
LEFT JOIN (
  SELECT article_id, COUNT(*) ::int AS num_views, MAX(created_at) AS last_read_at
  FROM article_read_count
  WHERE user_id IS NOT NULL
  GROUP BY 1
) t USING (article_id)
-- ORDER BY article_id DESC
LIMIT 0 -- 10000s
;

ALTER TABLE search_index.article ADD PRIMARY KEY (id), ALTER COLUMN title SET NOT NULL ;
ALTER TABLE search_index.article ADD COLUMN title_ts tsvector GENERATED ALWAYS AS (to_tsvector('chinese_zh', title)) STORED ;
ALTER TABLE search_index.article ADD COLUMN summary_ts tsvector GENERATED ALWAYS AS (to_tsvector('chinese_zh', summary)) STORED ;
ALTER TABLE search_index.article ADD COLUMN text_ts tsvector GENERATED ALWAYS AS (to_tsvector('chinese_zh', text_content_converted)) STORED ;
ALTER TABLE search_index.article ADD COLUMN title_jieba_ts tsvector GENERATED ALWAYS AS (to_tsvector('jiebacfg', title)) STORED ;
ALTER TABLE search_index.article ADD COLUMN summary_jieba_ts tsvector GENERATED ALWAYS AS (to_tsvector('jiebacfg', summary)) STORED ;
ALTER TABLE search_index.article ADD COLUMN text_jieba_ts tsvector GENERATED ALWAYS AS (to_tsvector('jiebacfg', text_content_converted)) STORED ;
ALTER TABLE search_index.article ADD COLUMN IF NOT EXISTS indexed_at timestamptz DEFAULT CURRENT_TIMESTAMP ;

-- CREATE INDEX search_index_article_title_fulltext_idx ON search_index.article USING GIN (to_tsvector('chinese_zh', title)) ;
-- CREATE INDEX search_index_article_text_content_fulltext_idx ON search_index.article USING GIN (to_tsvector('chinese_zh', text_content_converted)) ;
CREATE INDEX search_index_article_title_ts_gin_idx ON search_index.article USING GIN (title_ts) ;
CREATE INDEX search_index_article_summary_ts_gin_idx ON search_index.article USING GIN (summary_ts) ;
CREATE INDEX search_index_article_text_ts_gin_idx ON search_index.article USING GIN (text_ts) ;
CREATE INDEX search_index_article_title_ts_rum_idx ON search_index.article USING RUM (title_jieba_ts) ;
CREATE INDEX search_index_article_summary_ts_rum_idx ON search_index.article USING RUM (summary_jieba_ts) ;
CREATE INDEX search_index_article_text_ts_rum_idx ON search_index.article USING RUM (text_jieba_ts) ;

