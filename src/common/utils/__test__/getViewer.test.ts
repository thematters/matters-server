
import { getUserGroup } from 'common/utils'

test('getUserGroup test', () => {
  const pairs = [
    { id: null, ip: '1.2.3.4', group: 'a' },
  ]

  pairs.forEach(({ id, ip, group }) =>
    expect(getUserGroup({ id, ip })).toBe(group)
  )
})