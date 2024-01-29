const { baseDown } = require('../utils')

const articleTable = 'article'
const articleContentTable = 'article_content'
const articleVersionTable = 'article_version'

exports.up = async (knex) => {
  // create new tables, add new columns to article table

  await knex('entity_type').insert({ table: articleContentTable })
  await knex.schema.createTable(articleContentTable, (t) => {
    t.bigIncrements('id').primary()
    t.text('content').notNullable()
    t.string('hash').notNullable().unique()
    t.timestamp('created_at').defaultTo(knex.fn.now())

    t.index('hash')
  })

  await knex('entity_type').insert({ table: articleVersionTable })
  await knex.schema.createTable(articleVersionTable, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('article_id').unsigned().notNullable()
    t.string('title').notNullable()
    t.bigInteger('cover').unsigned()
    t.string('summary').notNullable()
    t.boolean('summary_customized')
    t.bigInteger('content_id').unsigned().notNullable()
    t.bigInteger('content_md_id').unsigned()
    t.specificType('tags', 'text ARRAY')
    t.specificType('connections', 'text ARRAY')
    t.integer('word_count').notNullable()
    t.string('data_hash')
    t.string('media_hash')
    t.string('language')
    t.bigInteger('circle_id').unsigned()
    t.enu('access', ['public', 'paywall']).notNullable()
    t.enu('license', [
      'cc_0',
      'cc_by_nc_nd_2',
      'cc_by_nc_nd_4',
      'arr',
    ]).notNullable()
    t.string('iscn_id')
    t.string('request_for_donation')
    t.string('reply_to_donator')
    t.boolean('can_comment').notNullable()
    t.boolean('sensitive_by_author').notNullable()
    t.text('description')
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.foreign('cover').references('id').inTable('asset')
    t.foreign('article_id').references('id').inTable('article')
    t.foreign('circle_id').references('id').inTable('circle')

    t.index('article_id')
  })
  await knex.schema.alterTable(articleTable, (t) => {
    t.boolean('sensitive_by_admin').notNullable().defaultTo(false)
  })
  // add article_version_id to comment

  // migrate data from draft to article_content, article_version
  await knex.schema.raw(`
DO $$
DECLARE
    draft_record RECORD;
    content_hash TEXT;
    content_id BIGINT;
    content_md_hash TEXT;
    content_md_id BIGINT;
    article_version_id BIGINT;
BEGIN
  RAISE NOTICE 'start data migration';
  FOR draft_record IN
    SELECT * FROM draft WHERE article_id IS NOT NULL AND publish_state='published' ORDER BY id
  LOOP
    RAISE NOTICE '  processing draft %', draft_record.id;

    -- get content_id, content_md_id

    content_hash := md5(draft_record.content);
    IF content_hash IS NULL THEN
      content_id := NULL;
    ELSE
      SELECT id INTO content_id FROM article_content WHERE hash = content_hash;
      IF NOT FOUND THEN
        INSERT INTO article_content (content, hash) VALUES (draft_record.content, content_hash) RETURNING id into content_id;
      END IF;
    END IF;
    RAISE NOTICE '    content_id %', content_id;

    content_md_hash := md5(draft_record.content_md);
    IF content_md_hash IS NULL THEN
      content_md_id := NULL;
    ELSE
      SELECT id INTO content_md_id FROM article_content WHERE hash = content_md_hash;
      IF NOT FOUND THEN
        INSERT INTO article_content (content, hash) VALUES (draft_record.content_md, content_md_hash) RETURNING id into content_md_id;
      END IF;
    END IF;
    RAISE NOTICE '    content_md_id %', content_md_id;

    -- insert article_version table
    INSERT INTO article_version (
      article_id,
      title,
      cover,
      summary,
      summary_customized,
      content_id,
      content_md_id,
      tags,
      connections,
      word_count,
      data_hash,
      media_hash,
      language,
      circle_id,
      access,
      license,
      iscn_id,
      request_for_donation,
      reply_to_donator,
      can_comment,
      sensitive_by_author,
      created_at,
      updated_at
    ) VALUES (
      draft_record.article_id,
      draft_record.title,
      draft_record.cover,
      draft_record.summary,
      draft_record.summary_customized,
      content_id,
      content_md_id,
      draft_record.tags,
      draft_record.collection,
      draft_record.word_count,
      draft_record.data_hash,
      draft_record.media_hash,
      draft_record.language,
      draft_record.circle_id,
      draft_record.access,
      draft_record.license,
      draft_record.iscn_id,
      draft_record.request_for_donation,
      draft_record.reply_to_donator,
      draft_record.can_comment,
      draft_record.sensitive_by_author,
      draft_record.created_at,
      draft_record.updated_at
    ) RETURNING id INTO article_version_id;
    RAISE NOTICE '    article_version_id %', article_version_id;
  END LOOP;
END
$$;
  `)
}

exports.down = async (knex) => {
  await baseDown(articleVersionTable)(knex)
  await baseDown(articleContentTable)(knex)
  await knex.schema.alterTable(articleTable, (t) => {
    t.dropColumn('sensitive_by_admin')
  })
}
