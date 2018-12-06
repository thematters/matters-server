import { v4 } from 'uuid'
import { UserService } from '../userService'

const userService = new UserService()

const testUser = {
  email: 'test@user.com',
  avatar: '-',
  userName: 'hi',
  displayName: 'world',
  password: '456',
  description: 'test'
}
const { password, ...testUserWithoutPassword } = testUser

test('create', async () => {
  const user = await userService.create(testUser)
  expect(user).toMatchObject(testUserWithoutPassword)
})

test('login success with correct password', async () => {
  const { auth } = await userService.login({
    email: 'test1@matters.news',
    password: '123'
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
  const count = await userService.countFollowees(1)
  expect(count).toBe(2)
})

test('countFollowers', async () => {
  const count = await userService.countFollowers(2)
  expect(count).toBe(2)
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
  const setting = await userService.findNotifySetting(1)
  expect(setting).toBeDefined()
})

test('findFollowees', async () => {
  const setting = await userService.findFollowees(1)
  expect(setting).toBeDefined()
})

test('findSubscriptions', async () => {
  const subs = await userService.findSubscriptions(1)
  expect(subs.length).toBe(3)
})
