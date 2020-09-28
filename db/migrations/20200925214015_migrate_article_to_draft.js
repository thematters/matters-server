const chunk = require('lodash/chunk')
const { v4: uuidv4 } = require('uuid')

const article_table = 'article'
const draft_table = 'draft'

const CHUNK_SIZE = 10

exports.up = async (knex) => {
  // Gather articles without `draft_id`
  const articles = await knex(article_table).select('id')
  const chunks = chunk(articles, CHUNK_SIZE)

  for (const ids of chunks) {
    // Gather articles with fields to be migrated
    const items = await knex(article_table)
      .select(
        'id',
        'draft_id',

        'word_count',
        'data_hash',
        'media_hash',
        'language'
      )
      .whereIn(
        'id',
        ids.map(({ id }) => id)
      )

    // Update drafts
    await Promise.all(
      items.map(async (item) => {
        const result = await knex(draft_table)
          .where({ id: item.draft_id })
          .update({
            article_id: item.id,
            word_count: item.word_count,
            data_hash: item.data_hash,
            media_hash: item.media_hash,
            language: item.language,
          })
          .returning('id')
        console.log(`article (${item.id}) updated to draft (${result[0]})`)
      })
    )
  }
}

exports.down = async (knex) => {}
