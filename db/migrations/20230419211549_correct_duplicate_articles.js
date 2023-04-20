/**
 * Publication logic in src/connectors/queue/publication.ts
 * would run into race condition that creates duplicate articles[0].
 * logic bug would be fixed in following commit.
 * [0] https://github.com/thematters/matters-server/issues/3254
 */

exports.up = async (knex) => {
  await knex.raw(`
    WITH duplicate_draft AS
      (
       SELECT draft_id
       FROM article
       WHERE state='active'
       GROUP BY draft_id
       HAVING count(1) >= 2
      ),
         duplicate_article AS
      (
       SELECT id
       FROM article
       WHERE draft_id in (SELECT draft_id FROM duplicate_draft)
       EXCEPT SELECT article_id
       FROM draft
       WHERE id in (SELECT draft_id FROM duplicate_draft)
      )
    UPDATE article
    SET state='archived', updated_at=now()
    WHERE id in (SELECT id FROM duplicate_article);
  `)
}

exports.down = async (_) => {}
