// create indexes for query performance

export const up = async (knex) => {
  await knex.raw(`-- create indexes
CREATE INDEX IF NOT EXISTS article_circle_article_id_idx ON article_circle (article_id) ;

CREATE INDEX IF NOT EXISTS circle_state_idx ON circle (state) ;
`)
}

export const down = async (knex) => {
  await knex.raw(`-- drop indexes
DROP INDEX IF EXISTS article_circle_article_id_idx;

DROP INDEX IF EXISTS circle_state_idx;
`)
}
