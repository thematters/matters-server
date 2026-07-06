const table = 'feature_flag'
const name = 'spam_ring_restriction'

// Dark launch: spam-ring 偵測即作者級排除（SPEC-blackhouse-permanent-and-auto §2-D）。
// flag 預設 off，upsert 不寫 user_restriction，行為與現狀完全相同。
// 列必須先存在，setFeature（UPDATE）才能當 kill-switch。
export const up = async (knex) => {
  await knex(table)
    .insert({ name, flag: 'off', value: null })
    .onConflict('name')
    .ignore()
}

export const down = async (knex) => {
  await knex(table).where({ name }).del()
}
