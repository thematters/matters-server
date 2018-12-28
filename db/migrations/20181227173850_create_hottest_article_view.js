const { baseDown } = require('../utils')

const table = 'hottest_article_view'

exports.up = async knex =>
  knex.raw(`
  SELECT article.*,
        GREATEST (latest_comment, latest_downstream, latest_appreciation) AS latest_activity
  FROM article
  LEFT JOIN
    ( SELECT max(created_at) AS latest_comment,
            article_id
    FROM COMMENT
    GROUP BY article_id ) AS c ON article.id = c.article_id
  LEFT JOIN
    ( SELECT max(created_at) AS latest_downstream,
            upstream_id
    FROM article
    GROUP BY upstream_id ) AS a ON article.id = a.upstream_id
  LEFT JOIN
    ( SELECT max(created_at) AS latest_appreciation,
            article_id
    FROM appreciate
    GROUP BY article_id) AS m ON article.id = m.article_id
`)

exports.down = baseDown(table)
