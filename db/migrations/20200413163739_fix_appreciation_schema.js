export const up = (knex) => {
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

  -- add constraints
  alter table appreciation
    alter column id set not null,
    alter column created_at set default now(),
    alter column created_at set not null;

  -- set sequence
  create sequence if not exists appreciation_id_seq
  owned by appreciation.id;

  -- set starting point of sequence
  select setval('appreciation_id_seq', (select max(id) from appreciation));

  -- add id default as sequence
  alter table appreciation
    alter column id set default nextval('appreciation_id_seq');
  `)
}

export const down = () => {}
