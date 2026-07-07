const CONTENT_TABLES = ['article', 'comment', 'moment']

// 凍結帳號內容自動標 Spam 的存量回填（SPEC-blackhouse-permanent-and-auto §2-B5）。
// 只補 is_spam IS NULL 的列：既有人工判定（true/false）不覆蓋。
// 誤凍帳號解凍時由 unfreezeUser 把 true 復原為 null（回到分類器評分判定）。
export const up = async (knex) => {
  for (const table of CONTENT_TABLES) {
    await knex(table)
      .whereNull('is_spam')
      .whereIn(
        'author_id',
        knex('user').select('id').where({ state: 'frozen' })
      )
      .update({ is_spam: true })
  }
}

// 反向：把仍處於凍結狀態的作者內容 is_spam 還原為 null。
// （已解凍帳號的內容由 unfreezeUser 復原，不在此範圍。）
export const down = async (knex) => {
  for (const table of CONTENT_TABLES) {
    await knex(table)
      .where({ is_spam: true })
      .whereIn(
        'author_id',
        knex('user').select('id').where({ state: 'frozen' })
      )
      .update({ is_spam: null })
  }
}
