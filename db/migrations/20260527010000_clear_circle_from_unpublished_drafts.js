export const up = async (knex) => {
  // clear stale circle association from unpublished/error drafts; circle is sunsetting
  // and any in-progress draft must not silently publish into a now-defunct circle
  await knex.raw(`
    UPDATE draft
    SET circle_id = NULL,
        access = 'public'
    WHERE circle_id IS NOT NULL
      AND publish_state IN ('unpublished', 'error')
  `)
}

export const down = async () => {
  // intentional no-op: circle is sunsetting, restoring stale circle associations
  // serves no purpose and we have no record of the original values to restore
}
