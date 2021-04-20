const payoutAccount = 'payout_account'

exports.up = async (knex) => {
  await knex(payoutAccount).update({ archived: true })
}

exports.down = () => {}
