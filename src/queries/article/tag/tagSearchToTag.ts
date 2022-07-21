import { TagSearchResultToTagResolver } from 'definitions'

const tagSearchToTag: TagSearchResultToTagResolver = async (
  { id },
  _args,
  { dataSources: { tagService } }
) => tagService.dataloader.load(`${id}`)

export default tagSearchToTag
