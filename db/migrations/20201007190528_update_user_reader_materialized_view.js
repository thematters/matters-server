const view = `user_reader_view`;
const materialized = `user_reader_materialized`;

exports.up = async (knex) => {
  await knex.raw(/*sql*/ `
  drop view if exists ${view} cascade;

  create view ${view} as
  SELECT "user".id,
    "user".uuid,
    "user".user_name,
    "user".display_name,
    "user".description,
    "user".avatar,
    "user".email,
    "user".email_verified,
    "user".mobile,
    "user".password_hash,
    "user".read_speed,
    "user".base_gravity,
    "user".curr_gravity,
    "user".language,
    "user".role,
    "user".state,
    "user".created_at,
    "user".updated_at,
    a.recent_donation,
    r.recent_readtime,
    (COALESCE(a.recent_donation, 0::bigint)+1)*COALESCE(r.recent_readtime, 0::bigint)*COALESCE(b.boost, 1::real) AS author_score
   FROM "user"
     LEFT JOIN ( SELECT ts.recipient_id, count(1) AS recent_donation
                FROM transaction ts
                WHERE ts.created_at >= now() - interval '1 week' AND ts.state = 'succeeded' AND ts.purpose = 'donation' AND ts.currency = 'HKD'
                GROUP BY ts.recipient_id) a ON a.recipient_id = "user".id
     LEFT JOIN (SELECT a2.author_id, sum(read_time) AS recent_readtime
           FROM article_read_count a1
            JOIN article a2 ON a1.article_id = a2.id
          WHERE a1.created_at >= now() - interval '1 week'
          AND a1.user_id is not null
          GROUP BY a2.author_id) r ON r.author_id = "user".id
     LEFT JOIN ( SELECT boost,
            user_id
           FROM user_boost) b ON "user".id = b.user_id
    where "user".state not in ('banned', 'frozen') and "user".id != 81
    order by author_score desc;

  create materialized view ${materialized} as
  select * from ${view};
  `);
};

exports.down = (knex) => {};
