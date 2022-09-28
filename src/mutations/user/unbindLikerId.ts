import { UserInputError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToUnbindLikerIdResolver } from 'definitions'

const resolver: MutationToUnbindLikerIdResolver = async (
  root,
  { input: { id, likerId } },
  { dataSources: { atomService, userService }, knex }
) => {
  const { id: dbId } = fromGlobalId(id)
  const user = await userService.dataloader.load(dbId)

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
