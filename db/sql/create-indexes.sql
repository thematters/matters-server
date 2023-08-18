
SHOW maintenance_work_mem ;
SET maintenance_work_mem TO '1 GB';
SHOW maintenance_work_mem ;

ALTER TABLE article ADD PRIMARY KEY (id), ALTER COLUMN uuid SET NOT NULL, ADD UNIQUE (uuid) ;
CREATE INDEX CONCURRENTLY IF NOT EXISTS article_state_index ON article(state) ;
CREATE INDEX CONCURRENTLY IF NOT EXISTS article_created_date_index ON article((timezone('utc'::text, created_at ::timestamptz)::date) DESC NULLS LAST) ;

ALTER TABLE article_circle ADD PRIMARY KEY (id), ALTER COLUMN article_id SET NOT NULL, ADD UNIQUE (article_id), ALTER COLUMN circle_id SET NOT NULL ;
CREATE INDEX CONCURRENTLY IF NOT EXISTS article_circle_access_index ON article_circle(access) ;
CREATE INDEX CONCURRENTLY IF NOT EXISTS article_circle_circle_id_index ON article_circle(circle_id) ;

ALTER TABLE appreciation ADD PRIMARY KEY (id),
  ALTER COLUMN uuid SET NOT NULL, --, ADD UNIQUE (uuid) ; historical wrong dup uuid
  ALTER COLUMN recipient_id SET NOT NULL,
  ALTER COLUMN purpose SET NOT NULL,
  ALTER COLUMN type SET NOT NULL ;
CREATE INDEX CONCURRENTLY IF NOT EXISTS appreciation_sender_id_index ON appreciation(sender_id) ;
CREATE INDEX CONCURRENTLY IF NOT EXISTS appreciation_recipient_id_index ON appreciation(recipient_id) ;
CREATE INDEX CONCURRENTLY IF NOT EXISTS appreciation_reference_id_index ON appreciation(reference_id) ;
CREATE INDEX CONCURRENTLY IF NOT EXISTS appreciation_purpose_index ON appreciation(purpose) ;
CREATE INDEX CONCURRENTLY IF NOT EXISTS appreciation_type_index ON appreciation(type) ;

ALTER TABLE IF EXISTS asset ADD PRIMARY KEY (id), ALTER COLUMN uuid SET NOT NULL, ADD UNIQUE (uuid) ;

ALTER TABLE "user" ADD PRIMARY KEY (id),
  ALTER COLUMN uuid SET NOT NULL, ADD UNIQUE (uuid),
  ALTER COLUMN user_name SET NOT NULL, ADD UNIQUE (user_name),
  -- ALTER COLUMN email SET NOT NULL -- there were 32 accounts with no email, -- -- by mistake
  ADD UNIQUE (email) ;
CREATE INDEX CONCURRENTLY IF NOT EXISTS user_state_index ON "user"(state) ;
CREATE INDEX CONCURRENTLY IF NOT EXISTS user_created_date_index ON "user"((timezone('utc'::text, created_at ::timestamptz)::date) DESC NULLS LAST) ;

CREATE INDEX CONCURRENTLY IF NOT EXISTS asset_type_index ON asset(type) ;
CREATE INDEX CONCURRENTLY IF NOT EXISTS article_tag_tag_id_index ON article_tag(tag_id DESC NULLS LAST) ;

ALTER TABLE article_tag ALTER COLUMN tag_id SET NOT NULL, ALTER COLUMN article_id SET NOT NULL ;
CREATE INDEX CONCURRENTLY IF NOT EXISTS article_tag_tag_id_index ON article_tag(tag_id DESC NULLS LAST) ;
CREATE INDEX CONCURRENTLY IF NOT EXISTS article_tag_article_id_index ON article_tag(article_id DESC NULLS LAST) ;

ALTER TABLE comment ADD PRIMARY KEY (id),
  ALTER COLUMN uuid SET NOT NULL,
  ADD UNIQUE (uuid),
  ALTER COLUMN author_id SET NOT NULL,
  ALTER COLUMN target_id SET NOT NULL,
  ALTER COLUMN target_type_id SET NOT NULL
;
CREATE INDEX CONCURRENTLY IF NOT EXISTS comment_state_index ON comment(state) ;
CREATE INDEX CONCURRENTLY IF NOT EXISTS comment_author_id_index ON comment(author_id DESC NULLS LAST) ;
CREATE INDEX CONCURRENTLY IF NOT EXISTS comment_article_id_index ON comment(article_id DESC NULLS LAST) ;
CREATE INDEX CONCURRENTLY IF NOT EXISTS comment_target_id_target_type_id_4_index ON comment(target_id DESC NULLS LAST) WHERE target_type_id = 4 ;

-- the MATERIALIZED VIEW will block ETL process, create a regular table instead
CREATE TABLE IF NOT EXISTS public.article_read_time_materialized AS
 -- copied from article_read_time_materialized
 SELECT -- article_read_count.article_id AS id,
    article_read_count.article_id,
    sum(article_read_count.read_time) AS sum_read_time
   FROM article_read_count
     JOIN "user" ON "user".id = article_read_count.user_id
  WHERE article_read_count.user_id IS NOT NULL AND ("user".state = ANY (ARRAY['active'::text]))
  GROUP BY article_read_count.article_id ;

ALTER TABLE public.article_read_time_materialized ADD PRIMARY KEY (article_id) ;
-- CREATE UNIQUE INDEX IF NOT EXISTS article_read_time_materialized_unique_article_id_index ON public.article_read_time_materialized(article_id) ;

ALTER TABLE article_read_count ADD PRIMARY KEY (id), ALTER COLUMN article_id SET NOT NULL ;
CREATE INDEX CONCURRENTLY IF NOT EXISTS article_read_count_user_id_index ON article_read_count(user_id DESC NULLS LAST) WHERE user_id IS NOT NULL ;
CREATE INDEX CONCURRENTLY IF NOT EXISTS article_read_count_article_id_index ON article_read_count(article_id DESC NULLS LAST) ;
CREATE INDEX CONCURRENTLY IF NOT EXISTS article_read_count_created_date_index ON article_read_count((timezone('utc'::text, created_at ::timestamptz)::date) DESC NULLS LAST) ;

-- REFRESH MATERIALIZED VIEW CONCURRENTLY public.article_read_time_materialized ;
-- COMMENT ON TABLE public.article_read_time_materialized IS :comment ;

