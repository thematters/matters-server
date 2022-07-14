// create indexes for query performance

exports.up = async (knex) => {
  await knex.raw(`-- create indexes
CREATE UNIQUE INDEX IF NOT EXISTS tag_content_unique_index ON public.tag (content) WHERE NOT deleted ;
`)
}

exports.down = async (knex) => {
  await knex.raw(`-- drop indexes
DROP INDEX IF EXISTS tag_content_unique_index ;
`)
}
