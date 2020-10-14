import { ArticleToWordCountResolver } from 'definitions'

const resolver: ArticleToWordCountResolver = async (
  { draftId },
  _,
  { viewer, dataSources: { draftService } }
) => {
  // fetch data from latest linked draft
  const draft = await draftService.dataloader.load(draftId)
  if (draft && draft.wordCount) {
    return draft.wordCount
  }

  return 0
}

export default resolver
