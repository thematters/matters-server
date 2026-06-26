const momentTagTable = 'moment_tag'

export const up = async (knex) => {
  await knex.schema.alterTable(momentTagTable, (t) => {
    // Allow a moment to link multiple tags
    t.dropUnique(['moment_id'])
    // Prevent linking the same tag to a moment twice
    t.unique(['moment_id', 'tag_id'])
  })
}

export const down = async (knex) => {
  await knex.schema.alterTable(momentTagTable, (t) => {
    t.dropUnique(['moment_id', 'tag_id'])
    t.unique(['moment_id'])
  })
}
