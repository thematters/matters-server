import _replace from 'lodash/replace'
import _some from 'lodash/some'
import _trim from 'lodash/trim'
import _uniq from 'lodash/uniq'

import {
  AuthenticationError,
  DuplicateTagError,
  ForbiddenError,
  TagNotFoundError,
  UserInputError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToPutTagResolver } from 'definitions'

const resolver: MutationToPutTagResolver = async (
  root,
  { input: { id, content, description } },
  { viewer, dataSources: { tagService, userService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('viewer has no permission')
  }

  const tagContent = content ? _trim(content) : ''

  if (!id) {
    // create tag
    // check tag content
    if (!tagContent) {
      throw new UserInputError('"content" is required in creation')
    }

    // check if any same tag content exists
    const tags = await tagService.findByContent({ content: tagContent })
    if (tags.length > 0) {
      throw new DuplicateTagError(`dulpicate tag content: ${tagContent}`)
    }

    const matty = (
      await userService.baseFind({
        where: { email: 'hi@matters.news', role: 'admin', state: 'active' },
        limit: 1,
      })
    )[0]

    const newTag = await tagService.create({
      content: tagContent,
      creator: viewer.id,
      description,
      editors: _uniq([matty.id, viewer.id]),
    })

    // add tag into search engine
    await tagService.addToSearch({
      id: newTag.id,
      content: newTag.content,
      description: newTag.description,
    })
    return newTag
  } else {
    // update tag
    const { id: dbId } = fromGlobalId(id)
    const tag = await tagService.baseFindById(dbId)
    if (!tag) {
      throw new TagNotFoundError('tag not found')
    }

    const isEditor = _some(tag.editors, (editor) => editor.id === viewer.id)
    const isCreator = tag.creator === viewer.id
    const canEdit = isEditor || isCreator || viewer.email === 'hi@matters.news'

    if (!canEdit) {
      throw new ForbiddenError('only editor, creator, and matty can manage tag')
    }

    // gather tag update params
    const updateParams: { [key: string]: any } = {}

    if (tagContent) {
      if (tagContent !== tag.content) {
        const tags = await tagService.findByContent({ content: tagContent })
        if (tags.length > 0) {
          throw new DuplicateTagError(`dulpicate tag content: ${tagContent}`)
        }
      }
      updateParams.content = tagContent
    }
    if (typeof description !== 'undefined' && description !== null) {
      updateParams.description = description
    }
    if (Object.keys(updateParams).length === 0) {
      throw new UserInputError('bad request')
    }
    if (!isEditor && isCreator) {
      updateParams.editors = _uniq([...tag.editors, viewer.id])
    }

    const updateTag = await tagService.baseUpdate(dbId, updateParams)

    // update tag for search engine
    await tagService.updateSearch({
      id: updateTag.id,
      content: updateTag.content,
      description: updateTag.description,
    })
    return updateTag
  }
}

export default resolver
