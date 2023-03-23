const table = 'transaction_delta_view'

export const up = async (knex) => {
  await knex.raw(/*sql*/ `DROP view IF EXISTS ${table}`)

  await knex.raw(/*sql*/ `
    create view ${table} as
        select
            "user".id as user_id,
            amount as delta,
            trx1.*
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
            trx2.*
        from
            "user"
            join (
                select
                    *
                from
                    transaction) as trx2 on trx2.sender_id = "user".id
  `)
}

export const down = function (knex, Promise) {
  return knex.raw(/*sql*/ `drop view ${table}`)
}
