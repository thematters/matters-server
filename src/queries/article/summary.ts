import { ARTICLE_STATE } from 'common/enums'
import { makeSummary } from 'common/utils'
import { ArticleToSummaryResolver } from 'definitions'

const resolver: ArticleToSummaryResolver = async (
  { cover, draftId },
  _,
  { viewer, dataSources: { draftService } }
) => {
  // fetch data from the latest linked draft
  const draft = await draftService.dataloader.load(draftId)
  if (draft && draft.content) {
    return makeSummary(draft.content, cover ? 110 : 140)
  }

  return ''
}

export default resolver
