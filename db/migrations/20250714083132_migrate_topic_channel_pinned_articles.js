export const up = async (knex) => {
  await knex.schema.raw(`
     UPDATE topic_channel SET pinned_articles = array(
       SELECT article_id FROM topic_channel_article
         WHERE pinned = true AND channel_id = topic_channel.id
         ORDER BY pinned_at DESC
       );
  `)
}

export const down = () => {
  // do nothing
}
