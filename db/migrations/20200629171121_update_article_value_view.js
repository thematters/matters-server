const view = `article_value_view`;
const materialized = `article_value_materialized`;

exports.up = async (knex) => {
  await knex.raw(/*sql*/ `
  drop view if exists ${view} cascade;

  create view ${view} as
  select id,
    title,
    created_at,
    base_score1 + base_score2 + boost_score1 + boost_score2 as score,
    base_score1,
    base_score2,
    boost_score1,
    boost_score2
  from
  (select article.id,
      article.title,
      article.created_at,
      least(coalesce(donation_sum, 0), 2000) as base_score1,
      least(coalesce(read_2_days, 0) / 5000 * (2 + post_days) / (1 + post_days), 1000) as base_score2,
      100 * coalesce(like_30_mins, 0) + 500 * coalesce(donation_30_mins, 0) as boost_score1,
      greatest(400 - 2 * since_comment, 0) + greatest(600 - 3 * since_like, 0) + greatest(1000 - 5 * since_donate, 0) as boost_score2
  from article
  left join
  (select target_id,
          sum(1000 / power((current_date - created_at::date) + 1, 2)) as donation_sum
  from transaction
  where transaction.purpose = 'donation'
    and transaction.currency = 'HKD'
  group by target_id) as d1 on d1.target_id = article.id
  left join
  (select article_id,
          sum(read_time) as read_2_days
  from article_read_count
  where updated_at >= now() - interval '2 days'
  group by article_id) as r1 on r1.article_id = article.id
  left join
  (select reference_id,
          sum(amount) as like_30_mins
  from appreciation
  where created_at >= now() - interval '30 minutes'
  group by reference_id) as lc2 on lc2.reference_id = article.id /* past 30 minutes appreciation */
  left join
  (select target_id,
          count(id) as donation_30_mins
  from transaction
  where transaction.purpose = 'donation'
    and transaction.currency = 'HKD'
    and created_at >= now() - interval '30 minutes'
  group by target_id) as d2 on d2.target_id = article.id
  left join
  (select id,
          current_date - created_at::date as post_days
  from article) as pd on pd.id = article.id /* article created_at minutes */
  left join
  (select target_id,
          extract(epoch
                  from now() - min(created_at)) / 60 as since_donate
  from transaction
  where transaction.purpose = 'donation'
    and transaction.currency = 'HKD'
    and created_at >= now() - interval '30 days'
  group by target_id) as fd on fd.target_id = article.id
  left join
  (select article_id,
          extract(epoch
                  from now() - min(created_at)) / 60 as since_comment
  from comment
  where created_at >= now() - interval '30 days'
  group by article_id) as fc on fc.article_id = article.id /* minutes since first comment */
  left join
  (select reference_id,
          extract(epoch
                  from now() - min(created_at)) / 60 as since_like
  from appreciation
  where created_at >= now() - interval '30 days'
  group by reference_id) as fl on fl.reference_id = article.id /* minutes since first appreciation */ ) as scores;


  create materialized view ${materialized} as
  select *
  from ${view}
  `);
};

exports.down = async (knex) => {
  await knex.raw(`drop view if exists ${view} cascade`);
  await knex.raw(`drop materialized view if exists ${materialized} cascade`);
};
