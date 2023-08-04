import type { GQLUserInfoResolvers } from 'definitions'

const resolver: GQLUserInfoResolvers['socialAccounts'] = async () => [
  {
    type: 'Twitter',
    userName: 'fakeUserName',
  },
  {
    type: 'Facebook',
    userName: 'fakeUserName',
  },
  {
    type: 'Google',
    email: 'fakeusername@gmail.com',
  },
]

export default resolver
