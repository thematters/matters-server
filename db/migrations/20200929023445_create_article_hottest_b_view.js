const view = `article_hottest_b_view`
const materialized = `article_hottest_b_materialized`

const time_window = 3
const donation_decay_factor = 0.9

export const up = async (knex) => {
  await knex.raw(/*sql*/ `
  create view ${view} as
  with original_score as (
    select max(read_time_efficiency) as max_efficiency from
    (
        select
        a.id,
        (sum(arc.read_time)::decimal/least(extract(epoch from now()-a.created_at)::decimal + 1, ${time_window}*24*3600))^0.5 as read_time_efficiency from article a
        join public.user u on a.author_id = u.id
        join article_read_count arc on a.id = arc.article_id
        where a.state = 'active'
        and arc.created_at >= to_timestamp((extract(epoch from now()) - ${time_window}*24*3600))
        and arc.user_id is not null
        and (MOD(arc.user_id, 2) = 1 or arc.user_id in (select id from public.user where role = 'admin'))
        group by a.id
    ) t
  )

  select article.id, article.title, article.created_at, 'https://matters.news/@-/-' || article.media_hash as link, coalesce(t.score, 0) as score
  from article
  left join
  (
      select t1.*, t2.latest_transaction,
      (select max_efficiency from original_score) as max_efficiency,
      (select max_efficiency from original_score)*coalesce(${donation_decay_factor}^(extract(epoch from now()-t2.latest_transaction)::decimal/3600), 0) as donation_score,
      t1.read_time_efficiency + (select max_efficiency from original_score) * ${donation_decay_factor}^(coalesce(extract(epoch from now()-t2.latest_transaction), 3600*100)::decimal/3600) as score
      from
      (
          select
          a.id,
          a.title,
          a.created_at,
          u.display_name,
          'https://matters.news/@-/-' || a.media_hash as link,
          sum(arc.read_time) as read_seconds_in_time_window,
          (sum(arc.read_time)::decimal/least(extract(epoch from now()-a.created_at)::decimal + 1, ${time_window}*24*3600))^0.5 as read_time_efficiency
          from article a
          join public.user u on a.author_id = u.id
          join article_read_count arc on a.id = arc.article_id
          where a.state = 'active'
          and arc.created_at > to_timestamp((extract(epoch from now()) - ${time_window}*24*3600))
          and arc.user_id is not null
          and (MOD(arc.user_id, 2) = 1 or arc.user_id in (select id from public.user where role = 'admin'))
          group by a.id, u.display_name
      ) t1
      left join
      (
           select target_id, max(updated_at) as latest_transaction
           from transaction
           where target_type = 4 and state = 'succeeded' and purpose = 'donation'
           and (currency = 'LIKE' and amount >= 100 or currency = 'HKD')
           and (MOD(sender_id, 2) = 1 or sender_id in (select id from public.user where role = 'admin'))
           group by target_id
      ) t2 on t1.id = t2.target_id
  ) t on article.id = t.id
  where article.state = 'active'
  order by score desc, created_at desc;

  create materialized view ${materialized} as
  select *
  from ${view}
  `)
}

export const down = function (knex) {
  knex.raw(/*sql*/ `
  drop view ${view} cascade;
  `)
}
