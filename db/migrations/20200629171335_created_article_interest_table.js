const view = `article_interest_view`
const materialized = `article_interest_materialized`

export const up = (knex) =>
  knex.raw(/*sql*/ `
  create view ${view} as
  with tag_interest as
    (select tag_id,
            user_id,
            user_tag.count::decimal / tag_total.count as interest
     from
       (select tag_id,
               user_id,
               count(tag_id) as count
        from
          (select article_id as id,
                  author_id as user_id
           from comment
           union select reference_id as id,
                        sender_id as user_id
           from appreciation) articles
        join article_tag on article_tag.article_id = articles.id
        where user_id is not null
        group by tag_id,
                 user_id) user_tag
     join
       (select count(tag_id) as count,
               tag_id as id
        from article_tag
        group by tag_id) tag_total on tag_total.id = user_tag.tag_id),

  article_interest as
    (select article.id,
            tag_interest.user_id,
            sum(interest) as interest
     from article
     join article_tag on article_tag.article_id = article.id
     join tag_interest on article_tag.tag_id = tag_interest.tag_id
     where article.state = 'active'
     group by article.id,
              tag_interest.user_id)

  select article_value_materialized.id,
         article_interest.user_id,
         (score::decimal /
            ((select max(score)
             from article_value_materialized) + 1)) * (interest::decimal /
                                                           ((select max(interest)
                                                            from article_interest) + 1)) as score
  from article_value_materialized
  join article_interest on article_interest.id = article_value_materialized.id
  left join
    (select article_id,
            user_id
     from article_read_count
     where user_id is not null ) "read" on "read".article_id = article_interest.id
  and "read".user_id = article_interest.user_id
  where "read".article_id is null and score > 0;

  create materialized view ${materialized} as
  select *
  from ${view};
  `)

export const down = (knex) =>
  knex.raw(/*sql*/ `
  drop view if exists ${view} cascade;
  `)
