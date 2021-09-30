const table = "user_reader_view";

exports.up = async (knex) =>
  knex.raw(/*sql*/ `
    create view ${table} as
        select
            "user".*,
            recent_appreciators,
            recent_reads,
            coalesce(recent_appreciators, 0) * coalesce(recent_reads, 0) * coalesce(boost, 1) as author_score
        from
            "user"
            left join
            /* past 6 month appreciators */
            (
                select
                    count(distinct sender_id) as recent_appreciators,
                    author_id
                from
                    transaction as ts
                    join article as ar on ts.reference_id = ar.id
                where
                    ts.created_at >= now() - interval '6 months'
                    and ts.purpose = 'appreciate'
                group by
                    author_id) as a on a.author_id = "user".id
            left join
            /* past 6 month read */
            (
                select
                    count(distinct user_id) as recent_reads,
                    author_id
                from
                    article_read as a1
                    join article as a2 on a1.article_id = a2.id
                where
                    a1.created_at >= now() - interval '6 months'
                group by
                    author_id) as r on r.author_id = "user".id
            left join
            /* boost */
            (
                select
                    boost,
                    user_id
                from
                    user_boost) as b on "user".id = b.user_id
  `);

exports.down = function (knex, Promise) {
  return knex.raw(/*sql*/ `drop view if exists ${table} cascade`);
};
