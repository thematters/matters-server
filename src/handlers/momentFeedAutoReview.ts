import type { APIGatewayProxyResult } from 'aws-lambda'

import { FEATURE_FLAG } from '#common/enums/index.js'
import { environment } from '#common/environment.js'
import { MomentService } from '#connectors/momentService.js'
import { SystemService } from '#connectors/systemService.js'

import { connections } from '../connections.js'

export const handler = async (): Promise<APIGatewayProxyResult> => {
  await connections.ensureConnected()

  const systemService = new SystemService(connections)
  const feature = await systemService.getFeatureFlag('hottest_moment_feed')
  if (!feature || feature.flag === FEATURE_FLAG.off) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'hottest moment feed disabled, auto review skipped',
      }),
    }
  }

  const momentService = new MomentService(connections)
  const count = await momentService.autoApproveExpiredMomentFeedApplications({
    expireHours: environment.momentFeedAutoApproveHours,
  })

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: `auto approved ${count} moment feed applications`,
    }),
  }
}
