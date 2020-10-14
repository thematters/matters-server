import slugify from '@matters/slugify'

import { ArticleToSlugResolver } from 'definitions'

const resolver: ArticleToSlugResolver = async (
  { draftId },
  _,
  { viewer, dataSources: { draftService } }
) => {
  // fetch data from latest linked draft
  const draft = await draftService.dataloader.load(draftId)
  if (draft && draft.title) {
    return slugify(draft.title)
  }

  return ''
}

export default resolver
