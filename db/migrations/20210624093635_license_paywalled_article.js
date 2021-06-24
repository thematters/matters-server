const draft_table = 'draft'

exports.up = async (knex) => {
  // mark license of paywalled articles as `arr`
  await knex.raw(`
    UPDATE ${draft_table}
    SET license = 'arr'
    WHERE publish_state = 'published'
      AND access = 'paywall'
  `)
}

exports.down = async () => {}
