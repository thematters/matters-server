const table = 'article_activity_materialized'

exports.up = async knex => {
  await knex.raw(/*sql*/ `
  drop materialized view ${table}

  create materialized view ${table} as
  select
    *,
    (comment_3_day+3*like_5_day)*(1+post_days)/post_days as base_score,
    (15*comment_30_min+80*like_30_minute) as boost_score_1
  from (
  select
    article.id,
    article.title,
    coalesce(comment_3_day,0) as comment_3_day,
    coalesce(comment_30_min,0) as comment_30_min,
    coalesce(like_5_day,0) as like_5_day,
    coalesce(like_30_minute,0) as like_30_minute,
    since_comment,
    since_like,
    post_days
  from article

  /* past comment count */
  left join (
    select
      article_id,
      sum((created_at >= now() -  interval '3 days')::int) as comment_3_day,
      sum((created_at >= now() -  interval '30 minutes')::int) as comment_30_min
    from comment
    group by article_id
  ) as cc on cc.article_id = article.id

  /* past 5 days like */
  left join (
    select
      reference_id,
      sum(amount) as like_5_day
    from transaction
    where purpose = 'appreciate' and created_at >= now() -  interval '5 days'
      group by reference_id
  ) as lc1 on lc1.reference_id = article.id

  /* past 30 minutes like */
  left join (
    select
      reference_id,
      sum(amount) as like_30_minute
    from transaction
    where purpose = 'appreciate' and created_at >= now() -  interval '30 minutes'
      group by reference_id
  ) as lc2 on lc2.reference_id = article.id

  /* number of days since published */
  left join (
  select
    id,
    current_date - created_at::date as post_days
  from
    article
  ) as pd on pd.id = article.id

  /* minutes since first comment */
  left join (
  select
    article_id,
    DATE_PART('minute', now()-min(created_at)) as since_comment
  from
    comment
  group by article_id
  ) as fc on fc.article_id = article.id

  /* minutes since first like */
  left join (
  select
    reference_id,
    DATE_PART('minute', now()-min(created_at)) as since_like
  from
    transaction
  where purpose = 'appreciate'
  group by reference_id
  ) as fl on fl.reference_id = article.id

  ) as joined

  order by base_score desc
  `)
}

exports.down = function(knex, Promise) {}
