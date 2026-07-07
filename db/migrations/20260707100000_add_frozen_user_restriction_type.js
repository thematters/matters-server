const table = 'user_restriction'
const constraint = 'user_restriction_type_check'

// 新增 user_restriction 類型 'frozen':凍結帳號退出 newest/icymi/channels
// (SPEC-frozen-newest-icymi-recovery)。查詢端沿用已部署的
// excludeRestrictedAuthors 過濾,不動熱路徑查詢形狀——#4920 的逐 row user
// 表探測曾在 prod 造成 newest timeout(#4927 回退),本機制是其替代。
// t.enu() 產生的 CHECK constraint 需重建才能容納新值。
const TYPES = ['articleHottest', 'articleNewest', 'spamRing', 'frozen']

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
  // 歷史回填:現存 frozen 用戶各補一筆(一戶一 row,冪等)。
  // #4926 之後的凍結由 freezeUser 即時寫入,這裡只補存量。
  await knex.raw(`
    INSERT INTO "${table}" (user_id, type)
    SELECT id, 'frozen' FROM "user" WHERE state = 'frozen'
    ON CONFLICT (user_id, type) DO NOTHING
  `)
}

export const down = async (knex) => {
  // 先清掉 frozen 列,否則收窄 constraint 會失敗
  await knex(table).where({ type: 'frozen' }).del()
  await setCheck(
    knex,
    TYPES.filter((t) => t !== 'frozen')
  )
}
