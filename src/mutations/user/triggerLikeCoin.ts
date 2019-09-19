import { MutationToTriggerLikeCoinResolver } from 'definitions'

const resolver: MutationToTriggerLikeCoinResolver = async (
  _,
  { input: { action } },
  { viewer, dataSources: { userService } }
) => {
  /**
   * Note: all actions are called asynchronously, we will not wait the results.
   * To see the progress, you can query the `oss.noLikerIdCount`.
   */
  if (action === 'generateTempUsers') {
    userService.generateTempLikeCoinUsers()
  }

  // if (action === 'transferPendingLIKE') {
  //   oauthService.generateTempUsers()
  // }

  return true
}

export default resolver
