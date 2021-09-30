/**
 * In realase v3.6.0 (2020-07-31 20:29 GMT+8), the unit of read_time
 * changed from second to millsecond. To revert it, divide read_time
 * which is updated after 2020-07-31 20:29 GMT+8 by 1000.
 */

exports.up = async (knex) => {
  await knex.raw(`
    UPDATE
        article_read_count
    SET
        read_time = ROUND(read_time::NUMERIC/1000)
    WHERE
        updated_at > '2020-07-31 12:29:00'
  `);
};

exports.down = async (knex) => {};
