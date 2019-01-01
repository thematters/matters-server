import { v4 } from 'uuid'
import { UserService } from '../userService'

const userService = new UserService()

const testUser = {
  email: 'test@user.com',
  userName: 'hi',
  displayName: 'world',
  password: '456',
  description: 'test'
}
const { password, ...testUserWithoutPassword } = testUser
let testUserId: string

test('create fail with the same email', async () => {
  try {
    const sameEmailTestUser = { ...testUser, userName: 'test_user_name_2' }
    await userService.create(sameEmailTestUser)
  } catch (e) {
    expect(() => {
      throw e
    }).toThrowError('user_email_unique')
  }
})

test('create fail with the same userName', async () => {
  try {
    const sameUserNameTestUser = { ...testUser, email: 'test3@user.com' }
    await userService.create(sameUserNameTestUser)
  } catch (e) {
    expect(() => {
      throw e
    }).toThrowError('user_user_name_unique')
  }
})

test('findByEmail', async () => {
  const user = await userService.findByEmail(testUser.email)
  expect(user).toMatchObject(testUserWithoutPassword)
})

test('findByUserName', async () => {
  const user = await userService.findByUserName(testUser.userName)
  expect(user).toMatchObject(testUserWithoutPassword)
})

test('findNotifySetting', async () => {
  expect(await userService.findNotifySetting('1')).toBeDefined()
  expect(await userService.findNotifySetting(testUserId)).toBeDefined()
})

test('updateNotifySetting', async () => {
  const { id } = await userService.findNotifySetting(testUserId)
  // disable
  const { mention: disabledMention } = await userService.updateNotifySetting(
    id,
    {
      mention: false
    }
  )
  expect(disabledMention).toBe(false)
  // re-enable
  const { mention: enabledMention } = await userService.updateNotifySetting(
    id,
    {
      mention: true
    }
  )
  expect(enabledMention).toBe(true)
})
