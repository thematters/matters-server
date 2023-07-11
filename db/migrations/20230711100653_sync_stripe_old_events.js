const { baseDown } = require('../utils')

const table = 'transaction'

// curl -G https://api.stripe.com/v1/transfers   -u sk...:  -d limit=500
const payouts = {
  production: [
    'tr_1Lm99SCE0HD6LY9UT0OPLSeB',
    'tr_1LlK2FCE0HD6LY9UxBT0F3TB',
    'tr_1LCQHvCE0HD6LY9UizwE6Crx',
    'tr_1LC3T8CE0HD6LY9U6axS9nEv',
    'tr_1LBgdQCE0HD6LY9U9kASRUPn',
    'tr_1LBDboCE0HD6LY9Uary3gsih',
    'tr_1LAzaqCE0HD6LY9U8gE4C8Dk',
    'tr_1JpqEaCE0HD6LY9U8zR7finR',
    'tr_1Jpa0fCE0HD6LY9UYKit9WW6',
    'tr_1JTPf1CE0HD6LY9U9Ggb5Lvh',
    'tr_1JT6QzCE0HD6LY9UEEwvXwsp',
    'tr_1JT3zECE0HD6LY9UoZzspcfA',
    'tr_1JScPoCE0HD6LY9U2CeFFUje',
    'tr_1JScLrCE0HD6LY9UW8LES0k6',
    'tr_1Izow6CE0HD6LY9U52lDPNbz',
    'tr_1IzhtrCE0HD6LY9Uc9AEVqcs',
    'tr_1IzhtSCE0HD6LY9U1TGvpbPq',
    // from old stripe account
    'pi_1I9nNzBTGbrMFLpPEQJuK5qb',
    'pi_1I8qkgBTGbrMFLpPRLI8jrWJ',
    'pi_1I6pYLBTGbrMFLpPzqesYQMP',
  ],
  development: ['tr_1NSHMYCE0HD6LY9UTlEPPBGF'],
}

// curl -G https://api.stripe.com/v1/disputes   -u sk...:   -d limit=10
const disputes = {
  production: [
    {
      id: 'du_1LO0GGCE0HD6LY9Ub9Zj5W7L',
      object: 'dispute',
      amount: 4000,
      charge: 'ch_3L5hL4CE0HD6LY9U01iTwFTi',
      created: 1658413316,
      currency: 'hkd',
      is_charge_refundable: false,
      livemode: true,
      metadata: {},
      payment_intent: 'pi_3L5hL4CE0HD6LY9U0PjWpNzb',
      reason: 'fraudulent',
      status: 'lost',
    },
    {
      id: 'du_1JhDDeCE0HD6LY9UhkSySPx7',
      object: 'dispute',
      amount: 2300,
      charge: 'ch_3Jfb6OCE0HD6LY9U0986Kmam',
      created: 1633438686,
      currency: 'hkd',
      is_charge_refundable: false,
      livemode: true,
      metadata: {},
      payment_intent: 'pi_3Jfb6OCE0HD6LY9U03JY4BEr',
      reason: 'fraudulent',
      status: 'lost',
    },
    {
      id: 'du_1JeZGtCE0HD6LY9UUaIuCDMd',
      object: 'dispute',
      amount: 50000,
      charge: 'ch_1JCdmJCE0HD6LY9Uxi8gHQYV',
      created: 1632808471,
      currency: 'hkd',
      is_charge_refundable: false,
      livemode: true,
      metadata: {},
      payment_intent: 'pi_1JCdmICE0HD6LY9UOZbeZDhf',
      reason: 'fraudulent',
      status: 'lost',
    },
    {
      id: 'du_1JeZFKCE0HD6LY9UgYu63jhI',
      object: 'dispute',
      amount: 50000,
      charge: 'ch_1JCdlSCE0HD6LY9Ub730qvvo',
      created: 1632808374,
      currency: 'hkd',
      is_charge_refundable: false,
      livemode: true,
      metadata: {},
      payment_intent: 'pi_1JCdlQCE0HD6LY9U5a9iux5p',
      reason: 'fraudulent',
      status: 'lost',
    },
    {
      id: 'du_1JeZFJCE0HD6LY9UXsXuadZ4',
      object: 'dispute',
      amount: 50000,
      charge: 'ch_1JBjEXCE0HD6LY9UEEIOJw3t',
      created: 1632808373,
      currency: 'hkd',
      is_charge_refundable: false,
      livemode: true,
      metadata: {},
      payment_intent: 'pi_1JBjEVCE0HD6LY9UVK1H6Zkq',
      reason: 'fraudulent',
      status: 'lost',
    },
    {
      id: 'du_1JcptxCE0HD6LY9UqLkUWoyO',
      object: 'dispute',
      amount: 20000,
      charge: 'ch_3JZByJCE0HD6LY9U0p26VYT3',
      created: 1632395741,
      currency: 'hkd',
      is_charge_refundable: false,
      livemode: true,
      metadata: {},
      payment_intent: 'pi_3JZByJCE0HD6LY9U0Cj9oSz8',
      reason: 'fraudulent',
      status: 'lost',
    },
    {
      id: 'du_1JcLNwCE0HD6LY9UlEmUNSC0',
      object: 'dispute',
      amount: 200000,
      charge: 'ch_3JVm2cCE0HD6LY9U1IuY6lLN',
      created: 1632278436,
      currency: 'hkd',
      is_charge_refundable: false,
      livemode: true,
      metadata: {},
      payment_intent: 'pi_3JVm2cCE0HD6LY9U15IINig7',
      reason: 'fraudulent',
      status: 'lost',
    },
    {
      id: 'du_1IfhRFCE0HD6LY9UsSG2khak',
      object: 'dispute',
      amount: 4000,
      charge: 'ch_1Ib7P3CE0HD6LY9U8Z1jH7cV',
      created: 1618301858,
      currency: 'hkd',
      is_charge_refundable: false,
      livemode: true,
      metadata: {},
      payment_intent: 'pi_1Ib7P2CE0HD6LY9UD46Tk2Ah',
      reason: 'fraudulent',
      status: 'lost',
    },
    {
      id: 'du_1IGLrpBTGbrMFLpPrintN3YF',
      object: 'dispute',
      amount: 10000,
      charge: 'ch_1I7FAMBTGbrMFLpPVwVd3ro8',
      created: 1612260737,
      currency: 'hkd',
      is_charge_refundable: false,
      livemode: true,
      metadata: {},
      payment_intent: 'pi_1I7FALBTGbrMFLpPMS6AEmtz',
      reason: 'fraudulent',
      status: 'lost',
    },
    {
      id: 'du_1IFEXuBTGbrMFLpPNl1GOWIf',
      object: 'dispute',
      amount: 10000,
      charge: 'ch_1I7FAhBTGbrMFLpP9rJytVFe',
      created: 1611994266,
      currency: 'hkd',
      is_charge_refundable: false,
      livemode: true,
      metadata: {},
      payment_intent: 'pi_1I7FAgBTGbrMFLpPribvjvTo',
      reason: 'fraudulent',
      status: 'lost',
    },
    {
      id: 'du_1I6aJLBTGbrMFLpPlv2qt5Dw',
      object: 'dispute',
      amount: 20493,
      charge: 'ch_1I47LoBTGbrMFLpP4g0QEhX5',
      created: 1609932979,
      currency: 'hkd',
      is_charge_refundable: false,
      livemode: true,
      metadata: {},
      payment_intent: 'pi_1I47LmBTGbrMFLpPFDCR6n8I',
      reason: 'fraudulent',
      status: 'lost',
    },
    {
      id: 'du_1I4PX0BTGbrMFLpPHSGUMlCQ',
      object: 'dispute',
      amount: 81888,
      charge: 'ch_1I1aPsBTGbrMFLpPlTWfG6Yi',
      created: 1609414886,
      currency: 'hkd',
      is_charge_refundable: false,
      livemode: true,
      metadata: {},
      payment_intent: 'pi_1I1aPpBTGbrMFLpPhiIpM8zi',
      reason: 'fraudulent',
      status: 'lost',
    },
    {
      id: 'du_1I4PWyBTGbrMFLpPxMTB60G0',
      object: 'dispute',
      amount: 51179,
      charge: 'ch_1I1U0cBTGbrMFLpPBeW2AiAY',
      created: 1609414884,
      currency: 'hkd',
      is_charge_refundable: false,
      livemode: true,
      metadata: {},
      payment_intent: 'pi_1I1U0cBTGbrMFLpPQg8VdUs7',
      reason: 'fraudulent',
      status: 'lost',
    },
  ],
  development: [
    {
      id: 'dp_1NSG31CE0HD6LY9UIvCvRFPA',
      object: 'dispute',
      amount: 10000,
      charge: 'ch_3NSG2zCE0HD6LY9U177wbJTJ',
      created: 1688979983,
      currency: 'hkd',
      is_charge_refundable: false,
      livemode: false,
      metadata: {},
      payment_intent: 'pi_3NSG2zCE0HD6LY9U1JYBsFkk',
      reason: 'fraudulent',
      status: 'needs_response',
    },
    {
      id: 'dp_1NSFXJCE0HD6LY9UwQC5d6HI',
      object: 'dispute',
      amount: 10000,
      charge: 'ch_3NSFXHCE0HD6LY9U19smDnMO',
      created: 1688978017,
      currency: 'hkd',
      is_charge_refundable: false,
      livemode: false,
      metadata: {},
      payment_intent: 'pi_3NSFXHCE0HD6LY9U1yjjWPts',
      reason: 'fraudulent',
      status: 'lost',
    },
    {
      id: 'dp_1NSFVTCE0HD6LY9USTLoOUps',
      object: 'dispute',
      amount: 10000,
      charge: 'ch_3NSFVQCE0HD6LY9U1RXzhpYx',
      created: 1688977903,
      currency: 'hkd',
      is_charge_refundable: false,
      livemode: false,
      metadata: {},
      payment_intent: 'pi_3NSFVQCE0HD6LY9U1076jMYk',
      reason: 'fraudulent',
      status: 'lost',
    },
  ],
  local: [
    {
      id: 'dp_test',
      object: 'dispute',
      amount: 10000,
      charge: 'ch_3NSFVQCE0HD6LY9U1RXzhpYx',
      created: 1688977903,
      currency: 'hkd',
      is_charge_refundable: false,
      livemode: false,
      metadata: {},
      payment_intent: 'pi_3LjzKpCE0HD6LY9U0tZxw56G',
      reason: 'fraudulent',
      status: 'lost',
    },
  ],
}

const env = process.env.MATTERS_ENV

exports.up = async (knex) => {
  // migrate payout reversals
  await knex(table)
    .whereIn('provider_tx_id', payouts[env] ?? [])
    .update({ state: 'failed' })
  for (const dispute of disputes[env] ?? []) {
    const payment = await knex(table)
      .where({ provider_tx_id: dispute.payment_intent })
      .first()
    if (payment && payment.state === 'succeeded') {
      await knex(table).insert({
        sender_id: payment.recipient_id,
        target_id: payment.id,
        target_type: '9',
        amount: payment.amount,
        currency: payment.currency,
        purpose: 'dispute-withdrawn-funds',
        state: 'succeeded',
        provider: 'stripe',
        provider_tx_id: dispute.id,
        updated_at: new Date(dispute.created * 1000),
      })
    } else {
      if (env === 'production' || env === 'development') {
        throw new Error(
          `payment ${dispute.payment_intent} not found or not succeeded`
        )
      }
    }
  }
}

exports.down = async (knex) => {
  await knex(table)
    .whereIn('provider_tx_id', payouts[env] ?? [])
    .update({ state: 'succeeded' })
  const disputeIds = (disputes[env] ?? []).map((d) => d.id)
  await knex(table).whereIn('provider_tx_id', disputeIds).del()
}
