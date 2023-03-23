const table = 'transaction_delta_view'

export const up = async (knex) => {
  await knex.raw(/*sql*/ `DROP view IF EXISTS ${table}`)

  await knex.raw(/*sql*/ `
    create view ${table} as
        select
            "user".id as user_id,
            amount as delta,
            purpose,
            reference_id,
            trx1.type,
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
            trx2.type,
            trx2.created_at
        from
            "user"
            join (
                select
                    *
                from
                    transaction) as trx2 on trx2.sender_id = "user".id
  `)
}

export const down = async (knex) => {
  await knex.raw(/*sql*/ `DROP view IF EXISTS ${table}`)

  await knex.raw(/*sql*/ `
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
                  amount,
                  purpose,
                  reference_id,
                  created_at,
                  recipient_id
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
                  amount,
                  purpose,
                  reference_id,
                  created_at,
                  sender_id
               from
                   transaction) as trx2 on trx2.sender_id = "user".id
 `)
}
