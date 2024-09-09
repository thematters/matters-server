import { Manager } from './manager'
import { NullClassifier } from './nullClassifier'

it('can add and get classifier', () => {
  const manager = new Manager({ default: 'default', drivers: {} })
  const classifier = new NullClassifier()
  manager.add('default', classifier)
  expect(manager.classifier('default')).toBe(classifier)
})

it('throws error when retrieving not exists classifier', () => {
  const manager = new Manager({ default: 'default', drivers: {} })
  expect(() => manager.classifier('default')).toThrow(
    new Error('Could not find "default" classifier.')
  )
})

it('can resolve classifier through config', () => {
  const manager = new Manager({
    default: 'default',
    drivers: {
      default: {
        driver: 'null',
      },
    },
  })
  expect(manager.classifier('default')).toBeInstanceOf(NullClassifier)
})

it('should return the same instance for multiple calls to getInstance()', () => {
  const instance1 = new Manager({ default: 'default', drivers: {} }).asGlobal()
  const instance2 = Manager.getInstance()
  expect(instance2).toBe(instance1)
})
