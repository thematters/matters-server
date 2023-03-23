import logger from 'common/logger.js'
import { ArticleService, DraftService } from 'connectors/index.js'

import { countWords } from './content.js'

async function main() {
  const articleIds = process.argv.slice(2)
  console.log('going to update wordCount for artcies:', articleIds)

  const draftService = new DraftService()
  const articleService = new ArticleService()

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

  logger.info('done.')
  process.exit()
}

if (require.main === module) {
  main().catch((err) => {
    console.error(new Date(), 'ERROR:', err)
    process.exit(1)
  })
}
