const view = `article_value_view`;
const materialized = `article_value_materialized`;

const drop_view = `article_activity_b_view`;
const drop_materialized = `article_activity_b_materialized`;

exports.up = (knex) =>
  knex.raw(/*sql*/ `
  drop view if exists ${drop_view} cascade;

  create view ${view} as
  select
    *,
    base_score1+base_score2+base_score3+boost_score1+boost_score2 as score
  from
  (select
      article.id,
      article.title,
      article.created_at,
      least(5*coalesce(like_24_hrs, 0) * (2+post_days)/(1+post_days), 400) as base_score1,
      least(40*coalesce(subscribe_3_days, 0)*(2+post_days)/(1+post_days), 500) as base_score2,
      least(50*coalesce(donation_2_days, 0)*(2+post_days)/(1+post_days), 500) as base_score3,
      50*coalesce(like_30_mins, 0)+100*coalesce(donation_30_mins, 0) as boost_score1,
      greatest(400-4*since_comment, 0) + greatest(500-5*since_like, 0)+ greatest(500-5*since_donate, 0) as boost_score2
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
  (select target_id,
          extract(epoch
                  from now()-min(created_at))/60 as since_donate
  from transaction
  where transaction.purpose='donation'
    and created_at >= now() - interval '30 days'
  group by target_id) as fd on fd.target_id=article.id
  left join
  (select target_id,
          count(id) as donation_2_days
  from transaction
  where transaction.purpose='donation'
    and created_at >= now() - interval '2 days'
  group by target_id) as d1 on d1.target_id=article.id
  left join
  (select target_id,
          count(id) as donation_30_mins
  from transaction
  where transaction.purpose='donation'
    and created_at >= now() - interval '30 minutes'
  group by target_id) as d2 on d2.target_id=article.id
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
  `);

exports.down = async (knex) => {
  await knex.raw(`drop view if exists ${view} cascade`);
  await knex.raw(`drop materialized view if exists ${materialized} cascade`);
};
