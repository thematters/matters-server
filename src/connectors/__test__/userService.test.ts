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
let testUserUUID: string

test('create', async () => {
  const user = await userService.create(testUser)
  testUserId = user.id
  testUserUUID = user.uuid
  expect(user).toMatchObject(testUserWithoutPassword)
})

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

test('login success with correct password', async () => {
  const { auth } = await userService.login({
    email: testUser.email,
    password: testUser.password
  })
  expect(auth).toBeTruthy()
})

test('login fail with incorrect password', async () => {
  const { auth } = await userService.login({
    email: 'test1@matters.news',
    password: '567'
  })
  expect(auth).toBeFalsy()
})

test('countFollowees', async () => {
  expect(await userService.countFollowees('1')).toBe(1)
  expect(await userService.countFollowees(testUserId)).toBe(0)
})

test('countFollowers', async () => {
  expect(await userService.countFollowers('2')).toBe(2)
  expect(await userService.countFollowers(testUserId)).toBe(0)
})

test('countSubscription', async () => {
  expect(await userService.countSubscription('1')).toBe(3)
  expect(await userService.countSubscription(testUserId)).toBe(0)
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

test('findFollowees', async () => {
  const user1Followees = await userService.findFollowees({ id: '1' })
  expect(user1Followees.length).toBe(1)

  const testUserFollowees = await userService.findFollowees({ id: testUserId })
  expect(testUserFollowees.length).toBe(0)
})

test('findFollowers', async () => {
  const user2Followers = await userService.findFollowers('2')
  expect(user2Followers.length).toBe(2)

  const testUserFollowers = await userService.findFollowers(testUserId)
  expect(testUserFollowers.length).toBe(0)
})

test('findSubscriptions', async () => {
  const subs = await userService.findSubscriptions('1')
  expect(subs.length).toBe(3)
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

test('follow and unfollow', async () => {
  const targetId = testUserId
  const count = await userService.countFollowers(targetId)

  // follow
  await userService.follow('1', targetId)
  const countAfterFollow = await userService.countFollowers(targetId)
  expect(countAfterFollow).toEqual(count + 1)

  // unfollow
  await userService.unfollow('1', targetId)
  const countAfterUnfollow = await userService.countFollowers(targetId)
  expect(countAfterUnfollow).toEqual(count)
})
