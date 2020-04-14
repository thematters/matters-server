exports.up = (knex) => {
  return knex.raw(/*sql*/ `
  -- fill in data
  update appreciation
  set
    id = r.rnum,
    created_at = r.created_at
  from (
    select
      appreciation.uuid,
        row_number() over () + (
          select
            max(id)
          from
            appreciation
          ) as rnum,
      greatest(article.created_at, (
        select
          max(created_at)
        from
          appreciation
      )) as created_at
    from appreciation
    left join article
    on article.id = appreciation.reference_id
    where appreciation.id is null
  ) r
  where appreciation.uuid = r.uuid;

  -- set sequence
  create sequence appreciation_id_seq
    owned by appreciation.id;

  -- set starting point of sequence
  select setval('appreciation_id_seq', (select max(id) from appreciation));

  -- add constraints
  alter table appreciation
    alter column id set default nextval('appreciation_id_seq'),
    alter column id set not null,
    add primary key (id),
    alter column created_at set default now(),
    alter column created_at set not null;
  `)
}

exports.down = () => {}
