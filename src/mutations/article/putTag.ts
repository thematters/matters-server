import type { GQLMutationResolvers } from 'definitions'

import {
  ASSET_TYPE,
  MAX_TAG_CONTENT_LENGTH,
  MAX_TAG_DESCRIPTION_LENGTH,
  USER_STATE,
} from 'common/enums'
import { environment } from 'common/environment'
import {
  AssetNotFoundError,
  DuplicateTagError,
  ForbiddenByStateError,
  ForbiddenError,
  NameInvalidError,
  TagNotFoundError,
  UserInputError,
} from 'common/errors'
import {
  fromGlobalId,
  normalizeTagInput, // stripAllPunct,
} from 'common/utils'

const resolver: GQLMutationResolvers['putTag'] = async (
  _,
  { input: { id, content, cover, description } },
  { viewer, dataSources: { systemService, tagService, atomService } }
) => {
  if (!viewer.userName) {
    throw new ForbiddenError('user has no username')
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

  const tagContent = (content && normalizeTagInput(content)) || ''

  if (!tagContent || tagContent.length > MAX_TAG_CONTENT_LENGTH) {
    throw new NameInvalidError(
      `invalid tag name, either empty or too long (>${MAX_TAG_CONTENT_LENGTH})`
    )
  }
  if (description && description?.length > MAX_TAG_DESCRIPTION_LENGTH) {
    throw new NameInvalidError(
      `invalid too long tag description (>${MAX_TAG_DESCRIPTION_LENGTH})`
    )
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
        editors: Array.from(
          new Set(
            environment.mattyId ? [environment.mattyId, viewer.id] : [viewer.id]
          )
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
    const isEditor = !!tag.editors?.some((editor: any) => editor === viewer.id)
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

    // delete unused tag cover
    if (tag.cover && tag.cover !== updateTag.cover) {
      const coverAsset = await atomService.findUnique({
        where: { id: tag.cover },
        table: 'asset',
      })
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
