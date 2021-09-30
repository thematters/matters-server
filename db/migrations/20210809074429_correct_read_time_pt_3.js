exports.up = async (knex) => {
  await knex.raw(`
    UPDATE
        article_read_count
    SET
        read_time = ROUND(read_time::NUMERIC/1000)
    FROM (
        SELECT
            base.*
        FROM (
            SELECT
                id,
                updated_at,
                read_time / COALESCE(NULLIF(timed_count, 0), 1) AS avg_time
            FROM
                article_read_count
        ) AS base
        WHERE
          base.avg_time > 1850
    ) AS source
    WHERE article_read_count.id = source.id
  `);
};

exports.down = async (knex) => {};
