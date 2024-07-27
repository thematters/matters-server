const REMARK = 'updated by 20240305100256_migrate_pinned_comments.js'

exports.up = async (knex) => {
  await knex.raw(`UPDATE comment SET pinned = false, remark = '${REMARK}'
    WHERE pinned = true
      AND type ='article'
      AND id NOT IN (
        SELECT MAX(comment.id) FROM comment JOIN article ON comment.target_id=article.id
        WHERE comment.type = 'article' AND comment.author_id = article.author_id and comment.pinned = true
        GROUP BY comment.target_id)`)
}

exports.down = async (knex) => {
  await knex.raw(`UPDATE comment SET pinned = true WHERE remark = '${REMARK}'`)
}
