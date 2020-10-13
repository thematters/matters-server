import { ArticleToMediaHashResolver } from 'definitions'

const resolver: ArticleToMediaHashResolver = async (
  { draftId },
  _,
  { viewer, dataSources: { draftService } }
) => {
  // fetch data from latest linked draft
  const draft = await draftService.dataloader.load(draftId)
  if (draft && draft.mediaHash) {
    return draft.mediaHash
  }

  return ''
}

export default resolver
