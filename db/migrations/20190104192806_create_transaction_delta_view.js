const table = "transaction_delta_view";

exports.up = async (knex) =>
  knex.raw(/*sql*/ `
    create view ${table} as
        select
            "user".id as user_id,
            amount as delta,
            purpose,
            reference_id,
            trx1.created_at
        from
            "user"
            join (
                select
                    *
                from
                    transaction) as trx1 on trx1.recipient_id = "user".id
        union
        select
            "user".id,
            (0 - amount) as delta,
            purpose,
            reference_id,
            trx2.created_at
        from
            "user"
            join (
                select
                    *
                from
                    transaction) as trx2 on trx2.sender_id = "user".id
  `);

exports.down = function (knex, Promise) {
  return knex.raw(/*sql*/ `drop view if exists ${table} cascade`);
};
