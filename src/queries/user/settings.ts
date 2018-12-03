import { Resolver } from 'src/definitions'

const resolver: Resolver = async (parent, _, { userService }) => {
  return {
    language: parent.language,
    ...(await userService.findSettingByUserId(parent.id))
  }
}

export default resolver
