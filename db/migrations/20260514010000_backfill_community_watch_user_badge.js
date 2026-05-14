export const up = async (knex) => {
  await knex.raw(`
    INSERT INTO user_badge (user_id, type)
    SELECT user_id, 'community_watch'
    FROM user_feature_flag
    WHERE type = 'communityWatch'
    ON CONFLICT (user_id, type) DO NOTHING
  `)
}

export const down = async (knex) => {
  await knex.raw(`
    DELETE FROM user_badge
    WHERE type = 'community_watch'
      AND user_id IN (
        SELECT user_id
        FROM user_feature_flag
        WHERE type = 'communityWatch'
      )
  `)
}
