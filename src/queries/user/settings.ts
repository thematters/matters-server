import { Resolver } from 'src/definitions'

const resolver: Resolver = async ({ id, language }, _, { userService }) => {
  return {
    language,
    ...(await userService.findSettingByUserId(id))
  }
}

export default resolver
