const view = `article_activity_view`;
const materialized = `article_activity_materialized`;

exports.up = async (knex) => {
  await knex.raw(/*sql*/ `
  drop view if exists ${view} cascade;


  create view ${view} as
  select id,
         base_score,
         boost_score_1,
         boost_score_2,
         base_score+boost_score_1+boost_score_2 as score
  from
    (select article.id,
            (coalesce(comment_3_day, 0)+3*coalesce(like_5_day, 0)) * (1+post_days)/(0.01+post_days) as base_score,
            (15*coalesce(comment_30_min, 0) + 80*coalesce(like_30_minute, 0)) as boost_score_1,
            greatest(120-2*since_comment, 0) + greatest(120-2*since_like, 0) as boost_score_2
     from article /* past comment count */
     left join
       (select article_id,
               sum((created_at >= now() - interval '3 days')::int) as comment_3_day,
               sum((created_at >= now() - interval '30 minutes')::int) as comment_30_min
        from comment
        group by article_id) as cc on cc.article_id = article.id /* past 5 days like */
     left join
       (select reference_id,
               sum(amount) as like_5_day
        from transaction
        where purpose = 'appreciate'
          and created_at >= now() - interval '5 days'
        group by reference_id) as lc1 on lc1.reference_id = article.id /* past 30 minutes like */
     left join
       (select reference_id,
               sum(amount) as like_30_minute
        from transaction
        where purpose = 'appreciate'
          and created_at >= now() - interval '30 minutes'
        group by reference_id) as lc2 on lc2.reference_id = article.id /* number of days since published */
     left join
       (select id,
               current_date - created_at::date as post_days
        from article) as pd on pd.id = article.id /* minutes since first comment */
     left join
       (select article_id,
               date_part('minute', now()-min(created_at)) as since_comment
        from comment
        group by article_id) as fc on fc.article_id = article.id /* minutes since first like */
     left join
       (select reference_id,
               date_part('minute', now()-min(created_at)) as since_like
        from transaction
        where purpose = 'appreciate'
        group by reference_id) as fl on fl.reference_id = article.id) as scores
     where id not in
        (select id
         from matters_today
         order by updated_at desc
         limit 1 );


  create materialized view ${materialized} as
  select *
  from ${view}
  `);
};

exports.down = async (knex) => {
  await knex.raw(`drop view if exists ${view} cascade`);
  await knex.raw(`drop materialized view if exists ${materialized} cascade`);
};
