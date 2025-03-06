import { UserInputError } from 'common/errors.js'
import { fromGlobalId } from 'common/utils/index.js'
import { GQLMutationResolvers } from 'definitions/index.js'

const resolver: GQLMutationResolvers['unbindLikerId'] = async (
  _,
  { input: { id, likerId } },
  {
    dataSources: {
      userService,
      atomService,
      connections: { knex },
    },
  }
) => {
  const { id: dbId } = fromGlobalId(id)
  const user = await atomService.userIdLoader.load(dbId)

  // check user's liker id
  if (user.likerId !== likerId) {
    throw new UserInputError(
      "input user's likerId doesn't equal to input likerId"
    )
  }

  // delete from `user_oauth_likecoin` table
  await knex
    .select()
    .from('user_oauth_likecoin')
    .where({ likerId: user.likerId })
    .del()

  // update `user` table
  await userService.baseUpdate(user.id, { likerId: null })

  return user
}

export default resolver
