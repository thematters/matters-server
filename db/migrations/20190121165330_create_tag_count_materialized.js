const table = "tag_count_materialized";

exports.up = async (knex) => {
  await knex.raw(/*sql*/ `
  create materialized view ${table} as
      select *
      from tag_count_view
  `);
};

exports.down = function (knex, Promise) {
  return knex.raw(/*sql*/ `drop materialized view if exists ${table}`);
};
