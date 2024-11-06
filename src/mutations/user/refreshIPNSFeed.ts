import type { GQLMutationResolvers } from 'definitions'

import { QUEUE_URL } from 'common/enums'
import { aws } from 'connectors'

const resolver: GQLMutationResolvers['refreshIPNSFeed'] = async (
  _,
  { input: { userName, numArticles = 50 } },
  { dataSources: { userService } }
) => {
  const ipnsKeyRec = await userService.findOrCreateIPNSKey(userName)

  if (ipnsKeyRec) {
    aws.sqsSendMessage({
      messageBody: { userName, useMattersIPNS: true },
      queueUrl: QUEUE_URL.ipnsUserPublication,
    })
  }

  return userService.findByUserName(userName)
}

export default resolver
