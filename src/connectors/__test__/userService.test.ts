import { UserService } from '../userService'
import { knex } from 'connectors/db'

afterAll(knex.destroy)

const userService = new UserService()

test('totalMAT', async () => {
  const count = await userService.totalMAT('1')
  expect(count).toBeDefined()
})
