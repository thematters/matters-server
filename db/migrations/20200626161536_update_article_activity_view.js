export const up = async (knex) => {
  await knex.raw(/*sql*/ `
  drop view article_activity_view cascade;

  create view article_activity_view as
  select id,
    title,
    comments_total,
    commenters_7d,
    commenters_1d,
    recent_comment_since,
    comments_total + commenters_7d * 5 + commenters_1d * 10 * (case
                                                                  when recent_comment_since <= 3600 then sqrt(3600 / recent_comment_since)
                                                                  else 1
                                                              end) as score
  from
  (select article.id,
      title,
      count(*) as comments_total,
      count(distinct (case
                          when now() - "comment"."created_at" <= '1 week' then "comment"."author_id"
                      end)) as commenters_7d,
      count(distinct (case
                          when now() - "comment"."created_at" <= '1 day' then "comment"."author_id"
                      end)) as commenters_1d,
      extract(epoch
              from now() - max("comment"."created_at")) as recent_comment_since
  from article
  left join comment on "article"."id" = "comment"."article_id"
  where "comment"."state" = 'active'
  group by article.id) as comment_score;

  create materialized view article_activity_materialized as
  select *
  from article_activity_view
  `)
}

export const down = async (knex) => {}
