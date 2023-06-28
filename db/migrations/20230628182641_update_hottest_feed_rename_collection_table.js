const view = `article_hottest_view`
const materialized = `article_hottest_materialized`

const time_window = 3
const donation_decay_factor = 0.5
const boost = 1
const boost_window = 3
const matty_donation_decay_factor = 0.95
const circle_boost = 2

exports.up = async (knex) => {
  await knex.raw(/*sql*/ `
  drop view if exists ${view} cascade;

  create view ${view} as
  with original_score as (
      select max(read_time_efficiency_boost) as max_efficiency from
      (
          select
          a.id,
          case when extract(epoch from now()-a.created_at) <= ${boost_window}*3600 then ${boost}*(sum(arc.read_time)::decimal/least(extract(epoch from now()-a.created_at)::decimal + 1, ${time_window}*24*3600))^0.5
               when ac.article_id is not null and extract(epoch from now()-a.created_at) < 24*3600 then ${circle_boost}*(sum(arc.read_time)::decimal/least(extract(epoch from now()-a.created_at)::decimal + 1, ${time_window}*24*3600))^0.5
               else (sum(arc.read_time)::decimal/least(extract(epoch from now()-a.created_at)::decimal + 1, ${time_window}*24*3600))^0.5 end as read_time_efficiency_boost
          from article a
          join public.user u on a.author_id = u.id
          join article_read_count arc on a.id = arc.article_id
          left join article_circle ac on ac.article_id = a.id
          where a.state = 'active'
          and arc.created_at >= to_timestamp((extract(epoch from now()) - ${time_window}*24*3600))
          and arc.user_id is not null
          and a.id not in (select entrance_id from article_connection where article_id = 8079 )
          group by a.id, ac.article_id, ac.created_at
      ) t
  )


  select article.id, article.title, article.created_at, 'https://matters.news/@-/-' || article.media_hash as link, coalesce(t.score, 0) as score
  from article
  left join
  (
      select
      case when ac.id is not null then 1 else 0 end as is_from_circle,
      t1.*,
      t2.latest_transaction, t3.latest_transaction_matty, t2.count_normal_transaction,
      (select max_efficiency from original_score) as max_efficiency,
      greatest(
          (select max_efficiency from original_score)*coalesce((${donation_decay_factor}^coalesce(t2.count_normal_transaction, 1))^(extract(epoch from now()-t2.latest_transaction)/3600) ::numeric(6,0), 0),
          (select max_efficiency from original_score)*coalesce(${matty_donation_decay_factor}^(extract(epoch from now()-t3.latest_transaction_matty)/3600) ::numeric(6,0), 0)
      ) as donation_score,
      t1.read_time_efficiency_boost + greatest(
          (select max_efficiency from original_score)*coalesce((${donation_decay_factor}^coalesce(t2.count_normal_transaction, 1))^(extract(epoch from now()-t2.latest_transaction)/3600) ::numeric(6,0), 0),
          (select max_efficiency from original_score)*coalesce(${matty_donation_decay_factor}^(extract(epoch from now()-t3.latest_transaction_matty)/3600) ::numeric(6,0), 0)
      ) as score
      from
      (
          select
          a.id,
          a.title,
          a.created_at,
          u.display_name,
          'https://matters.news/@-/-' || a.media_hash as link,
          sum(arc.read_time) as read_seconds_in_time_window,
          (sum(arc.read_time)::decimal/least(extract(epoch from now()-a.created_at)::decimal + 1, ${time_window}*24*3600))^0.5 as read_time_efficiency,
          case when extract(epoch from now()-a.created_at) <= ${boost_window}*3600 then ${boost}*(sum(arc.read_time)::decimal/least(extract(epoch from now()-a.created_at)::decimal + 1, ${time_window}*24*3600))^0.5
               when ac.article_id is not null and extract(epoch from now()-ac.created_at) < 24*3600 then ${circle_boost}*(sum(arc.read_time)::decimal/least(extract(epoch from now()-a.created_at)::decimal + 1, ${time_window}*24*3600))^0.5
               else (sum(arc.read_time)::decimal/least(extract(epoch from now()-a.created_at)::decimal + 1, ${time_window}*24*3600))^0.5 end as read_time_efficiency_boost
          from article a
          join public.user u on a.author_id = u.id
          join article_read_count arc on a.id = arc.article_id
          left join article_circle ac on ac.article_id = a.id
          where a.state = 'active'
          and arc.created_at > to_timestamp((extract(epoch from now()) - ${time_window}*24*3600))
          and arc.user_id is not null
          group by a.id, ac.article_id, ac.created_at, u.display_name
      ) t1
      left join
      (
           select target_id, max(updated_at) as latest_transaction, count(1) as count_normal_transaction
           from transaction
           where target_type = 4 and state = 'succeeded' and purpose = 'donation'
           -- and (currency = 'LIKE' and amount >= 100 or currency = 'HKD')
           -- and sender_id = 0
           and ((currency = 'HKD' and amount >= 5) or (currency = 'USDT' and amount >= 0.5))
           and sender_id not in (81, 20053, 6, 11, 150, 89281, 85591, 93960, 77498)
           group by target_id
      ) t2 on t1.id = t2.target_id
      left join
      (
           select target_id, max(updated_at) as latest_transaction_matty
           from transaction
           where target_type = 4 and state = 'succeeded' and purpose = 'donation'
           and sender_id in (81, 20053, 6, 11, 150, 89281, 85591, 93960, 77498)
           group by target_id
      ) t3 on t1.id = t3.target_id -- Matty boost
      left join article_circle ac on t1.id = ac.article_id
      where t1.id not in (select entrance_id from article_connection where article_id = 8079 ) --to block all articles in the Complaint Area
  ) t on article.id = t.id
  where article.state = 'active'
  order by score desc, created_at desc;

  create materialized view ${materialized} as
  select *
  from ${view};
  `)
}

exports.down = function (knex) {
  knex.raw(/*sql*/ `
  drop view ${view} cascade;
  `)
}
