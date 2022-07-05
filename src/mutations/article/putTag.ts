import _replace from 'lodash/replace'
import _some from 'lodash/some'
import _uniq from 'lodash/uniq'

import { ASSET_TYPE, USER_STATE } from 'common/enums'
import { environment } from 'common/environment'
import {
  AssetNotFoundError,
  AuthenticationError,
  DuplicateTagError,
  ForbiddenByStateError,
  ForbiddenError,
  NameInvalidError,
  TagNotFoundError,
  UserInputError,
} from 'common/errors'
import { fromGlobalId, stripAllPunct } from 'common/utils'
import { MutationToPutTagResolver } from 'definitions'

const resolver: MutationToPutTagResolver = async (
  root,
  { input: { id, content, cover, description } },
  { viewer, dataSources: { systemService, tagService, userService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  if (viewer.state === USER_STATE.frozen) {
    throw new ForbiddenByStateError(`${viewer.state} user has no permission`)
  }

  // check if cover exists when receving parameter cover
  let coverId
  if (cover) {
    const asset = await systemService.findAssetByUUID(cover)
    if (
      !asset ||
      asset.type !== ASSET_TYPE.tagCover ||
      asset.authorId !== viewer.id
    ) {
      throw new AssetNotFoundError('tag cover asset does not exists')
    }
    coverId = asset.id
  } else if (cover === null) {
    coverId = null
  }

  const tagContent = content ? stripAllPunct(content) : ''

  if (!tagContent) {
    throw new NameInvalidError('invalid tag name')
  }

  if (!id) {
    // check if any same tag content exists
    const tags = await tagService.findByContent({ content: tagContent })
    if (tags.length > 0) {
      throw new DuplicateTagError(`dulpicate tag content: ${tagContent}`)
    }

    const newTag = await tagService.create(
      {
        content: tagContent,
        creator: viewer.id,
        description,
        editors: _uniq(
          environment.mattyId ? [environment.mattyId, viewer.id] : [viewer.id]
        ),
        owner: viewer.id,
        cover: coverId,
      }
      // ['id', 'content', 'description', 'creator', 'editors', 'owner', 'cover']
    )

    return newTag
  } else {
    // update tag
    const { id: dbId } = fromGlobalId(id)
    const tag = await tagService.baseFindById(dbId)
    if (!tag) {
      throw new TagNotFoundError('tag not found')
    }

    // update only allow: owner, editor, matty
    const isOwner = tag.owner === viewer.id
    const isEditor = _some(tag.editors, (editor) => editor === viewer.id)
    const isMatty = viewer.id === environment.mattyId
    const isMaintainer = isOwner || isEditor || isMatty

    if (!isMaintainer) {
      throw new ForbiddenError('only owner, editor, and matty can manage tag')
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
    if (typeof coverId !== 'undefined') {
      updateParams.cover = coverId
    }
    if (Object.keys(updateParams).length === 0) {
      throw new UserInputError('bad request')
    }

    const updateTag = await tagService.baseUpdate(dbId, updateParams)

    // update tag for search engine
    await tagService.updateSearch({
      id: updateTag.id,
      content: updateTag.content,
      description: updateTag.description,
    })

    // delete unused tag cover
    if (tag.cover && tag.cover !== updateTag.cover) {
      const coverAsset = await tagService.baseFindById(tag.cover, 'asset')
      if (coverAsset) {
        await systemService.deleteAssetAndAssetMap({
          [`${coverAsset.id}`]: coverAsset.path,
        })
      }
    }
    return updateTag
  }
}

export default resolver
