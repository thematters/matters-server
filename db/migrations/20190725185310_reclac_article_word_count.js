import chunk from 'lodash/chunk.js'

const table = 'article'

const stripHtml = (html) =>
  (String(html) || '')
    .replace(/(<\/p><p>|&nbsp;)/g, ' ')
    .replace(/(<([^>]+)>)/gi, ' ')

const countWords = (html) => {
  const matches = stripHtml(html).match(/[\u4e00-\u9fcc]|\w+/g)
  return matches ? matches.length : 0
}

export const up = async (knex) => {
  // Gather ids
  const chunks = chunk(await knex(table).select('id'), 5)
  for (const ids of chunks) {
    // Gather items for update
    const items = await knex(table)
      .select('id', 'content')
      .whereIn(
        'id',
        ids.map(({ id }) => id)
      )

    // Generate new word counts
    const params = items.map(({ id, content }) => ({
      id,
      word_count: countWords(content),
    }))

    // Update
    await Promise.all(
      params.map(({ id, word_count }) =>
        knex(table).where({ id }).update({ word_count })
      )
    )
  }
}

export const down = async (knex) => {}
