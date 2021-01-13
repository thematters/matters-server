import { connectionFromArray, connectionFromPromisedArray } from 'common/utils'
import { DraftToCircleResolver } from 'definitions'

const resolver: DraftToCircleResolver = (
  { circles },
  _,
  { dataSources: { atomService } }
) => {
  if (!circles || circles.length <= 0) {
    return
  }

  return atomService.circleIdLoader.load(circles[0])
}

export default resolver
