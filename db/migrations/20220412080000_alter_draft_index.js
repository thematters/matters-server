// create indexes for query performance

export const up = async (knex) => {
  await knex.raw(`-- create indexes
CREATE INDEX IF NOT EXISTS draft_article_id_index ON draft(article_id DESC NULLS LAST) ;

CREATE INDEX IF NOT EXISTS action_tag_target_id_action_index ON action_tag(target_id DESC NULLS LAST, action) ;

CREATE INDEX IF NOT EXISTS appreciation_recipient_id_index ON appreciation(recipient_id DESC NULLS LAST) ;

CREATE INDEX IF NOT EXISTS article_read_count_user_id_index ON article_read_count(user_id DESC NULLS LAST) ;
`)
}

export const down = async (knex) => {
  await knex.raw(`-- drop indexes
DROP INDEX IF EXISTS draft_article_id_index;

DROP INDEX IF EXISTS action_tag_target_id_action_index;

DROP INDEX IF EXISTS appreciation_recipient_id_index;

DROP INDEX IF EXISTS article_read_count_user_id_index;
`)
}
