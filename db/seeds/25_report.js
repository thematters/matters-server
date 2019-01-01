const table = {
  report: 'report',
  report_asset: 'report_asset'
}

exports.seed = async knex => {
  // create report
  await knex(table.report).insert([
    // article
    {
      user_id: '3',
      category: 'spam',
      article_id: '1'
    },
    // comment
    {
      user_id: '3',
      category: 'spam',
      comment_id: '1'
    }
  ])

  // create report asset
  await knex(table.report_asset).insert([
    {
      report_id: '1',
      asset_id: '11'
    }
  ])
}
