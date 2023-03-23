import { baseDown } from '../utils.js'

export const up = async (knex) => {
  // copy transaction table
  await knex.raw(/*sql*/ `
  create table if not exists appreciation as
  table "transaction";
  `)

  // update article activity view and article activity materialized
  return knex.raw(/*sql*/ `
  drop view article_activity_view cascade;


  create view article_activity_view as
  select *,
    base_score+boost_score_1+boost_score_2 as score
  from
  (select article.id,
    article.title,article.created_at,
      least((0.5*coalesce(comment_12_hrs, 0)+2*coalesce(like_24_hrs, 0)) * (2+post_days)/(1+post_days),300) as base_score,
      (15*coalesce(comment_30_mins, 0) + 60*coalesce(like_30_mins, 0)) as boost_score_1,
      greatest(120-2*since_comment, 0) + greatest(240-2*since_like, 0) as boost_score_2
  from article /* past comment count */
  left join
  (select article_id,
          sum((created_at >= now() - interval '12 hours')::int) as comment_12_hrs,
          sum((created_at >= now() - interval '30 minutes')::int) as comment_30_mins
  from comment
  group by article_id) as cc on cc.article_id = article.id /* past 2 days like */
  left join
  (select reference_id,
          sum(amount) as like_24_hrs
  from appreciation
  where purpose = 'appreciate'
    and created_at >= now() - interval '24 hours'
  group by reference_id) as lc1 on lc1.reference_id = article.id /* past 30 minutes like */
  left join
  (select reference_id,
          sum(amount) as like_30_mins
  from appreciation
  where purpose = 'appreciate'
    and created_at >= now() - interval '30 minutes'
  group by reference_id) as lc2 on lc2.reference_id = article.id /* number of days since published */
  left join
  (select id,
          current_date - created_at::date as post_days
  from article) as pd on pd.id = article.id /* minutes since first comment */
  left join
  (select article_id,
          extract(epoch from now()-min(created_at))/60 as since_comment
  from comment
  where created_at >= now() - interval '30 days'
  group by article_id) as fc on fc.article_id = article.id /* minutes since first like */
  left join
  (select reference_id,
          extract(epoch from now()-min(created_at))/60 as since_like
  from appreciation
  where purpose = 'appreciate'
    and created_at >= now() - interval '30 days'
  group by reference_id) as fl on fl.reference_id = article.id) as scores
  where id not in
  (select article_id
    from matters_today
    order by updated_at desc
    limit 1);


  create materialized view article_activity_materialized as
  select *
  from article_activity_view`)
}

export const down = async () => {}
