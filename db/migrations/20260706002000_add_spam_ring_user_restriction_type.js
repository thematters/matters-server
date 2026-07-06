const table = 'user_restriction'
const constraint = 'user_restriction_type_check'

// 新增 user_restriction 類型 'spamRing'：spam-ring 偵測到的成員在人工複查前
// 先退出頻道/最新/熱門（SPEC-blackhouse-permanent-and-auto §2-D）。
// t.enu() 產生的 CHECK constraint 需重建才能容納新值。
const TYPES = ['articleHottest', 'articleNewest', 'spamRing']

const setCheck = async (knex, types) => {
  const list = types.map((t) => `'${t}'`).join(', ')
  await knex.raw(
    `ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${constraint}"`
  )
  await knex.raw(
    `ALTER TABLE "${table}" ADD CONSTRAINT "${constraint}" CHECK (type IN (${list}))`
  )
}

export const up = async (knex) => {
  await setCheck(knex, TYPES)
}

export const down = async (knex) => {
  // 先清掉 spamRing 列，否則收窄 constraint 會失敗
  await knex(table).where({ type: 'spamRing' }).del()
  await setCheck(
    knex,
    TYPES.filter((t) => t !== 'spamRing')
  )
}
