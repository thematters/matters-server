/**
 * In realase v4.13.2 (2023-01-06 15:28 GMT+8) of matters-web [0], it brought
 * a new bug which can cause duplicate form submission on HKD donation.
 *
 * The bug has been fixed at matters-web#3085[1], and this migration is
 * to correct the duplicate transactions during this time.
 *
 * [0] https://github.com/thematters/matters-web/releases/tag/v4.13.2
 * [1] https://github.com/thematters/matters-web/pull/3085
 */
const txIds = [
  '120157',
  '120149',
  '120146',
  '120136',
  '120125',
  '120122',
  '120106',
  '120090',
  '120086',
  '120058',
  '120056',
  '120053',
  '120046',
  '120044',
  '120042',
  '120037',
  '120035',
  '120033',
  '120014',
  '120009',
  '119993',
  '119990',
  '119985',
  '119979',
  '119975',
  '119973',
  '119969',
  '119966',
  '119957',
  '119951',
  '119949',
  '119929',
  '119927',
  '119907',
  '119903',
  '119899',
  '119897',
  '119891',
  '119885',
  '119883',
  '119876',
  '119874',
  '119871',
  '119867',
  '119863',
  '119845',
  '119843',
  '119841',
  '119839',
  '119837',
  '119834',
  '119832',
  '119830',
  '119827',
  '119825',
  '119823',
  '119817',
  '119815',
  '119811',
  '119803',
  '119799',
  '119797',
  '119792',
  '119789',
  '119778',
  '119755',
]

export const up = async (knex) => {
  await knex.raw(`
    UPDATE
        transaction
    SET
        state = 'canceled',
        updated_at = NOW()
    WHERE
        id IN (${txIds.join(',')})
        AND state = 'succeeded'
        AND currency = 'HKD'
        AND purpose = 'donation'
  `)
}

export const down = async (knex) => {}
