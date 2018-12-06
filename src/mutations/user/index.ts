import { Context } from 'definitions'

export default {
  Mutation: {
    userRegister: (root: any, args: any, { userService }: Context) =>
      userService.create(args),
    userLogin: (root: any, args: any, { userService }: Context) =>
      userService.login(args.input)
  }
}
