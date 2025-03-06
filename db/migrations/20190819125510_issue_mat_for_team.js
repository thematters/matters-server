const compact = require('lodash/compact')
const { v4: uuidv4 } = require('uuid')

const table = 'transaction'

const purpose = 'system-subsidy'

exports.up = async (knex) => {
  const items = [
    {
      userName: 'lalaland',
      role: 'admin',
      amount: 2000,
    },
    {
      userName: 'yingshinlee',
      role: 'admin',
      amount: 2000,
    },
    {
      userName: 'satsuki',
      role: 'admin',
      amount: 2000,
    },
    {
      userName: 'robertu',
      role: 'user',
      amount: 2000,
    },
    {
      userName: 'guo',
      role: 'admin',
      amount: 2000,
    },
    {
      userName: 'baize417',
      role: 'admin',
      amount: 1000,
    },
    {
      userName: 'andyischaos',
      role: 'admin',
      amount: 500,
    },
  ]

  const users = compact(
    await Promise.all(
      items.map(async ({ userName, role, amount }) => {
        const user = await knex('user')
          .select('id')
          .where({
            user_name: userName,
            role,
          })
          .first()
        if (user) {
          return {
            id: user.id,
            amount,
          }
        }
      })
    )
  )

  const result = await Promise.all(
    users.map(({ id, amount }) =>
      knex(table)
        .insert({
          uuid: uuidv4(),
          recipient_id: id,
          reference_id: id,
          purpose,
          amount,
        })
        .into(table)
        .returning(['id', 'recipient_id', 'amount'])
    )
  )
}

exports.down = () => {}
