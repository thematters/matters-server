import 'module-alias/register'

import { ArticleService, DraftService } from 'connectors'

import { countWords } from './content'

const main = async () => {
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

  console.info('done.')
  process.exit()
}

if (require.main === module) {
  main().catch((err) => {
    console.error(new Date(), 'ERROR:', err)
    process.exit(1)
  })
}
