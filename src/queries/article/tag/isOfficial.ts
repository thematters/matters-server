import { environment } from 'common/environment.js'
import { TagToIsOfficialResolver } from 'definitions'

const resolver: TagToIsOfficialResolver = async ({ id }) => {
  const { mattyChoiceTagId } = environment
  return id === mattyChoiceTagId
}

export default resolver
