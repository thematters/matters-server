const view = `article_activity_b_view`
const materialized = `article_activity_b_materialized`

export const up = async (knex) => {
  await knex.raw(/*sql*/ `
  create view ${view} as
    select
      *,
      base_score+base_score2+boost_score1+boost_score2 as score
    from
    (select
        article.id,
        least(5*coalesce(like_24_hrs, 0) * (2+post_days)/(1+post_days), 400) as base_score,
        least(50*coalesce(subscribe_3_days, 0)*(2+post_days)/(1+post_days), 600) as base_score2,
        50*coalesce(like_30_mins, 0) as boost_score1,
        greatest(400-4*since_comment, 0) + greatest(500-5*since_like, 0) as boost_score2
    from article
    left join
    (select reference_id,
            sum(amount) as like_30_mins
    from appreciation
    where created_at >= now() - interval '30 minutes'
    group by reference_id) as lc2 on lc2.reference_id = article.id /* past 30 minutes appreciation */
    left join
    (select reference_id,
            sum(amount) as like_24_hrs
    from appreciation
    where created_at >= now() - interval '24 hours'
    group by reference_id) as lc1 on lc1.reference_id = article.id /* past 24 hours appreciation */
    left join
    (select id,
            current_date - created_at::date as post_days
    from article) as pd on pd.id = article.id /* article created_at minutes */
    left join
    (select article_id,
            extract(epoch
                    from now()-min(created_at))/60 as since_comment
    from comment
    where created_at >= now() - interval '30 days'
    group by article_id) as fc on fc.article_id = article.id /* minutes since first comment */
    left join
    (select reference_id,
            extract(epoch
                    from now()-min(created_at))/60 as since_like
    from appreciation
    where created_at >= now() - interval '30 days'
    group by reference_id) as fl on fl.reference_id = article.id /* minutes since first appreciation */
    left join
    (select target_id,
            count((created_at >= now() - interval '3 days')::int) as subscribe_3_days
    from action_article
    where action='subscribe'
      and created_at >= now() - interval '3 days'
    group by target_id /* past 3 days subscribe */ ) as su on su.target_id=article.id) as scores
    order by score desc;


  create materialized view ${materialized} as
  select *
  from ${view}
  `)
}

export const down = (knex) =>
  knex.raw(/*sql*/ `
    drop view ${view} cascade;
  `)
