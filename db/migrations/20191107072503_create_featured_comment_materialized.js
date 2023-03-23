const table = 'featured_comment_materialized'

export const up = async (knex) => {
  await knex.raw(/*sql*/ `
  create materialized view ${table} as
  select *
    from (
    select *,
        (coalesce(upvote_count, 0) - coalesce(downvote_count, 0) + 1) *
        sqrt(coalesce(upvote_count, 0) + coalesce(downvote_count, 0)) as score
      from comment
      left join
      (select target_id as upvoted_id,
          coalesce(count(id), 0) as upvote_count
      from action_comment as action
      where action.action = 'up_vote'
      group by upvoted_id) as upvotes on comment.id = upvotes.upvoted_id
      left join
      (select target_id as downvoted_id,
          coalesce(count(id), 0) as downvote_count
      from action_comment as action
      where action.action = 'down_vote'
      group by downvoted_id) as downvotes on comment.id = downvotes.downvoted_id
      where parent_comment_id is null) as comment_score
  where pinned = true or score > 20
  `)
}

export const down = function (knex, Promise) {
  return knex.raw(/*sql*/ `drop materialized view ${table}`)
}
