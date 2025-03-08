export const up = async (knex) => {
  await knex.raw(`
    UPDATE
        tag
    SET
        owner = NULL,
        editors = array_remove(editors, tag.owner::text)
    FROM (
        SELECT
            id
        FROM
            "user"
        WHERE
            state = 'archived'
    ) AS source
    WHERE tag.owner = source.id
  `)
}

export const down = async (knex) => {}
