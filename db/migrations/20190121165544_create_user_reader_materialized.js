const table = "user_reader_materialized";

exports.up = async (knex) => {
  await knex.raw(/*sql*/ `
  create materialized view ${table} as
      select *
      from user_reader_view
  `);
};

exports.down = function (knex, Promise) {
  return knex.raw(/*sql*/ `drop materialized view if exists ${table}`);
};
