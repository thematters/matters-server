exports.up = async (knex) => {
  // data migration

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

    content_hash := md5(COALESCE (draft_record.content, ''));
    SELECT id INTO content_id FROM article_content WHERE hash = content_hash;
    IF NOT FOUND THEN
      INSERT INTO article_content (content, hash) VALUES (COALESCE (draft_record.content, ''), content_hash) RETURNING id into content_id;
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
      COALESCE (draft_record.summary, ''),
      draft_record.summary_customized,
      content_id,
      content_md_id,
      COALESCE (draft_record.tags, '{}'),
      COALESCE (draft_record.collection, '{}'),
      COALESCE (draft_record.word_count, 0),
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
    IF draft_record.sensitive_by_admin = true THEN
      UPDATE article SET sensitive_by_admin = true WHERE id = draft_record.article_id;
    END IF;
  END LOOP;
END
$$;
  `)
}

exports.down = () => {
  // do nothing
}
