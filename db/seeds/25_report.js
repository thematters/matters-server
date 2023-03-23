const table = {
  report: 'report',
  report_asset: 'report_asset',
}

export const seed = async (knex) => {
  // create report
  await knex(table.report).insert([
    // article
    {
      user_id: '3',
      category: '1',
      article_id: '1',
      description: 'description',
    },
    // comment
    {
      user_id: '3',
      category: '2',
      comment_id: '1',
      description: 'description',
    },
  ])

  // create report asset
  await knex(table.report_asset).insert([
    {
      report_id: '1',
      asset_id: '11',
    },
  ])
}
