const table = 'punish_record'

// OSS「關小黑屋」改為永久（SPEC-blackhouse-permanent-and-auto §2-A）。
// 存量一併轉永久：未到期的 banned punish_record 直接 archive，
// 每日 unbanUsers job 便不再自動解禁這些帳號（解禁改走人工 updateUserState）。
// 已到期但尚未處理的記錄留給 job 正常放行，不在此轉換。
export const up = async (knex) => {
  await knex(table)
    .where({ state: 'banned', archived: false })
    .where('expired_at', '>', knex.fn.now())
    .update({ archived: true, updated_at: knex.fn.now() })
}

// 反向：把「到期日還在未來」的已 archive 記錄還原成待處理。
// 只會撈回本 migration 轉換的那批（手動解禁會經 unbanUser 清掉記錄或已到期）。
export const down = async (knex) => {
  await knex(table)
    .where({ state: 'banned', archived: true })
    .where('expired_at', '>', knex.fn.now())
    .update({ archived: false, updated_at: knex.fn.now() })
}
