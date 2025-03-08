import { baseDown, alterEnumString } from '../utils.js'

const table = 'draft'

export const up = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'license', [
      'cc_0',
      'cc_by_nc_nd_2',
      'cc_by_nc_nd_4',
      'arr',
    ])
  )
  await knex.raw(
    `ALTER TABLE ${table} ALTER COLUMN license SET DEFAULT 'cc_by_nc_nd_4';`
  )
}

export const down = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'license', ['cc_0', 'cc_by_nc_nd_2', 'arr'])
  )
  await knex.raw(
    `ALTER TABLE ${table} ALTER COLUMN license SET DEFAULT 'cc_by_nc_nd_2';`
  )
}
