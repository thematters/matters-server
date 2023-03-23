import { fromGlobalId } from 'common/utils/index.js'
import { MutationToRenameTagResolver } from 'definitions'

const resolver: MutationToRenameTagResolver = async (
  root,
  { input: { id, content } },
  { viewer, dataSources: { tagService } }
) => {
  const { id: dbId } = fromGlobalId(id)
  const newTag = await tagService.renameTag({ tagId: dbId, content })

  // update tag for search engine
  tagService.updateSearch({
    id: newTag.id,
    content: newTag.content,
    description: newTag.description,
  })
  return newTag
}

export default resolver
