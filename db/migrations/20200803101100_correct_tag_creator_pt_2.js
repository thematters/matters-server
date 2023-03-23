const table = 'tag'

export const up = async (knex) => {
  // reset matty's tags
  const matty = await knex('user')
    .select('id')
    .where({ email: 'hi@matters.news', role: 'admin', state: 'active' })
    .first()

  const mattyTagIds = [
    52, 353, 471, 1034, 1582, 3753, 6854, 6855, 6856, 6859, 6861, 6892, 7247,
    8659, 8777, 9125, 10246, 10247, 10248, 10251, 10277, 10430, 10614, 10621,
    10735, 10841, 11022, 11067, 11165, 11304, 11617, 11634, 11690, 11832, 12045,
    12117, 12204, 12298, 12299, 12300, 12680, 12779, 12849, 12850, 13099, 13144,
    13272, 14285, 14755, 14871, 14945, 15028, 15685, 16257, 16411, 16933, 16935,
    20456,
  ]

  for (const id of mattyTagIds) {
    const tag = await knex(table).select('id', 'editors').where({ id }).first()

    if (!tag) {
      // console.log(`tag: ${id}, not exist`)
      continue
    }
    // if any user has picked the tag, then skip
    if (tag.editors && tag.editors.length > 1) {
      // console.log(`tag: ${id}, canceled`)
      continue
    }

    await knex(table).where({ id }).update({ creator: matty.id })
    // console.log(`tag: ${id}, updated`)
  }
}

export const down = async (knex) => {}
