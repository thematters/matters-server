import { Context } from 'definitions'

export default {
  Mutation: {
    userRegister: (root: any, { input }: any, { userService }: Context) =>
      userService.create(input),
    userLogin: (root: any, { input }: any, { userService }: Context) =>
      userService.login(input)
  }
}
