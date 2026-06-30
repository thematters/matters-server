import type { GQLMutationResolvers } from '#definitions/index.js'

import {
  AuthenticationError,
  ForbiddenError,
  UserInputError,
} from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'

const resolver: GQLMutationResolvers['setMomentTags'] = async (
  _,
  { input: { id: globalId, tags } },
  { viewer, dataSources: { momentService, tagService, atomService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const { id, type } = fromGlobalId(globalId)
  if (type !== 'Moment') {
    throw new UserInputError('invalid id')
  }

  const moment = await atomService.momentIdLoader.load(id)
  if (!moment) {
    throw new UserInputError('moment not found')
  }
  if (moment.authorId !== viewer.id) {
    throw new ForbiddenError('viewer has no permission')
  }

  // validate tags, then resolve them to ids (dedupe and cap are done in setTags)
  await Promise.all(
    tags.map((content) => tagService.validate(content, { viewerId: viewer.id }))
  )
  const tagIds = await Promise.all(
    tags.map(async (content) => {
      const tag = await tagService.upsert({ content, creator: viewer.id })
      return tag.id
    })
  )

  await momentService.setTags(id, tagIds)

  return moment
}

export default resolver
