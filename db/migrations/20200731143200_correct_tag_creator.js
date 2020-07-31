const table = 'tag'

exports.up = async (knex) => {

  // reset matty's tags
  const matty = await knex('user')
    .select('id')
    .where({ email: 'hi@matters.news', role: 'admin', state: 'active' })
    .first()

  const mattyTagIds = [
    6898,  6899,  7114,  10167, 10446, 11631, 11633, 11708, 11838, 12778,
    13004, 13006, 13145, 13699, 13796, 14631, 15017, 16421, 16679, 17273,
    17503, 19034, 19296, 19497, 19756, 19862, 20833, 21371,

    1211,  3937,  6025,  7727,  9549,  9913,  10249, 10431, 10537, 10716,
    10989, 11168, 11354, 11492, 11528, 11650, 11705, 12691, 13482, 13704,
    13801, 14105, 14428, 14547, 14551, 15137, 15493, 15608, 16209, 18832,
    21292
  ]

  for(const id of mattyTagIds) {
    const tag = await knex(table)
      .select('id', 'editors')
      .where({ id })
      .first()

    if (!tag) {
      console.log(`tag: ${id}, not exist`)
      continue
    }
    // if any user has picked the tag, then skip
    if (tag.editors && tag.editors.length > 1) {
      console.log(`tag: ${id}, canceled`)
      continue
    }

    await knex(table).where({ id }).update({ creator: matty.id })
    console.log(`tag: ${id}, updated`)
  }


  // reset others' tags
  const otherTagIds = [
    11475, 12794, 15860, 16956, 18114, 19338
  ]

  for (const id of otherTagIds) {
    const tag = await knex(table)
      .select('id', 'editors')
      .where({ id })
      .first()

    if (!tag) {
      console.log(`tag: ${id}, not exist`)
      continue
    }
    // if any user has picked the tag, then skip
    if (tag.editors && tag.editors.length > 1) {
      console.log(`tag: ${id}, canceled`)
      continue
    }

    const data = await knex.raw(`
      SELECT
        article_tag.*,
        article.author_id
      FROM
        article_tag
      INNER JOIN
        article ON article.id = article_tag.article_id
      WHERE tag_id = ${id}
      ORDER BY created_at
      LIMIT 1
    `)

    if (!data || !data[0] || !data[0].author_id) {
      console.log(`tag: ${id}, could not find author`)
      continue
    }

    await knex(table).where({ id }).update({ creator: data[0].author_id })
    console.log(`tag: ${id}, updated`)
  }
}

exports.down = async (knex) => {}
