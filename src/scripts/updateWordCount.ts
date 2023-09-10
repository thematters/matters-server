import 'module-alias/register'

import { countWords } from 'common/utils'
import { ArticleService, DraftService } from 'connectors'
import { connections } from 'routes/connections'

const main = async () => {
  const articleIds = process.argv.slice(2)
  console.log('going to update wordCount for artcies:', articleIds)

  const draftService = new DraftService(connections)
  const articleService = new ArticleService(connections)

  await Promise.all(
    articleIds.map(async (articleId) => {
      console.log('articleId:', articleId)
      const a = await articleService.baseFindById(articleId)
      console.log('got article:', a.wordCount)
      const n = countWords(a.content)
      if (n !== a.wordCount) {
        const na = await articleService.baseUpdate(articleId, { wordCount: n })
        console.log('update article countWords to:', na)
      }

      const d = await draftService.baseFindById(a.draftId)
      console.log('got draft:', d)
      const nd = countWords(d.content)
      if (nd !== d.wordCount) {
        const na = await articleService.baseUpdate(a.draftId, { wordCount: n })
        console.log('update draft countWords to:', na)
      }
    })
  )

  console.info('done.')
  process.exit()
}

if (require.main === module) {
  main().catch((err) => {
    console.error(new Date(), 'ERROR:', err)
    process.exit(1)
  })
}
