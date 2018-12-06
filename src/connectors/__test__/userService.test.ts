import { v4 } from 'uuid'
import { UserService } from '../userService'

const userService = new UserService()

test('create', async () => {
  const testUser = {
    email: 'test@user.com',
    avatar: '-',
    userName: 'hi',
    displayName: 'world',
    password: '456',
    description: 'test'
  }

  const { password, ...rest } = testUser
  const user = await userService.create(testUser)
  expect(user).toMatchObject(rest)
})
