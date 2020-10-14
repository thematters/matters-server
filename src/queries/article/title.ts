import { ArticleToTitleResolver } from 'definitions'

const resolver: ArticleToTitleResolver = async (
  { draftId },
  _,
  { viewer, dataSources: { draftService } }
) => {
  // fetch data from latest linked draft
  const draft = await draftService.dataloader.load(draftId)
  if (draft && draft.title) {
    return draft.title
  }

  return ''
}

export default resolver
