import { ArticleToDataHashResolver } from 'definitions'

const resolver: ArticleToDataHashResolver = async (
  { draftId },
  _,
  { viewer, dataSources: { draftService } }
) => {
  // fetch data from latest linked draft
  const draft = await draftService.dataloader.load(draftId)
  if (draft && draft.dataHash) {
    return draft.dataHash
  }

  return ''
}

export default resolver
