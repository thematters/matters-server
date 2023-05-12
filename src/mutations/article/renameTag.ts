import { fromGlobalId } from 'common/utils'
import { MutationToRenameTagResolver } from 'definitions'

const resolver: MutationToRenameTagResolver = async (
  root,
  { input: { id, content } },
  { viewer, dataSources: { tagService } }
) => {
  const { id: dbId } = fromGlobalId(id)
  const newTag = await tagService.renameTag({ tagId: dbId, content })

  return newTag
}

export default resolver
