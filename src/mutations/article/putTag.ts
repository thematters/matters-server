import _replace from 'lodash/replace'
import _trim from 'lodash/trim'

import {
  AuthenticationError,
  DuplicateTagError,
  ForbiddenError,
  TagNotFoundError,
  UserInputError
} from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToPutTagResolver } from 'definitions'

const resolver: MutationToPutTagResolver = async (
  root,
  { input: { id, content, description } },
  { viewer, dataSources: { tagService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('viewer has no permission')
  }

  // temporarily safety check
  if (viewer.email !== 'hi@matters.news') {
    throw new ForbiddenError('only Matty can manage tag at this moment')
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

    return tagService.create({
      content: tagContent,
      description,
      editors: [viewer.id]
    })
  } else {
    // update tag
    const { id: dbId } = fromGlobalId(id)
    const tag = await tagService.baseFindById(dbId)
    if (!tag) {
      throw new TagNotFoundError('tag not found')
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
    return tagService.baseUpdate(dbId, updateParams)
  }
}

export default resolver
