const chunk = require('lodash/chunk')
const { v4: uuidv4 } = require('uuid')

const article_table = 'article'
const draft_table = 'draft'
const article_tag_table = 'article_tag'
const tag_table = 'tag'
const collection_table = 'collection'

const CHUNK_SIZE = 50
const REMARK = '{20200924152927_fix_article_draft_relationship,}'

exports.up = async (knex) => {
  // Gather articles without `draft_id`
  const articles = await knex(article_table).select('id').whereNull('draft_id')
  const chunks = chunk(articles, CHUNK_SIZE)

  for (const ids of chunks) {
    // Gather articles with all fields
    const items = await knex(article_table)
      .select()
      .whereIn(
        'id',
        ids.map(({ id }) => id)
      )

    // Create a draft based on the article, then update `draft_id`
    await Promise.all(
      items.map(async (item) => {
        // gather tags
        const tagIds = (
          await knex(article_tag_table)
            .select('tag_id')
            .where({ article_id: item.id })
        ).map(({ tag_id }) => tag_id)
        const tags = (
          await knex(tag_table).select('content').whereIn('id', tagIds)
        ).map(({ content }) => content)

        // gather collection
        const collection = (
          await knex(collection_table)
            .select('article_id')
            .where({ entrance_id: item.id })
            .orderBy('order')
        ).map(({ articleId }) => articleId)

        // create draft
        const [draft] = await knex(draft_table)
          .insert({
            uuid: uuidv4(),
            author_id: item.author_id,
            title: item.title,
            cover: item.cover,
            summary: item.summary,
            content: item.content,
            created_at: item.created_at,
            updated_at: item.created_at, // use created_at
            archived: false,
            publish_state: 'published',
            tags: tags.length > 0 ? tags : null,
            collection: collection.length > 0 ? collection : null,
          })
          .returning(['id'])
        console.log(`draft: ${draft.id}, inserted`)

        // update article
        await knex(article_table)
          .where({ id: item.id })
          .update({ draft_id: draft.id, remark: REMARK })
        console.log(`article: ${item.id}, updated`)
      })
    )
  }
}

exports.down = async (knex) => {}
