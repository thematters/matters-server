import { TagToEditorsResolver } from 'definitions'

const resolver: TagToEditorsResolver = (
  { editors },
  _,
  { dataSources: { userService } }
) => userService.dataloader.loadMany(editors || [])

export default resolver
