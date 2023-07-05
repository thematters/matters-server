import Stripe from 'stripe'

import { PAYMENT_CURRENCY } from 'common/enums'

import { stripe } from '../stripe'

const testUser1 = {
  id: '1',
  email: 'test1@matters.news',
}
const testUser2 = {
  id: '2',
  email: 'test2@matters.news',
}

// const stripeAPI = (stripe as any).stripeAPI as Stripe
let customer: Stripe.Customer

test('create customer', async () => {
  const _customer = await stripe.createCustomer({ user: testUser1 })
  expect(_customer?.id).toBeDefined()
  expect(_customer?.email).toBe(testUser1.email)

  if (_customer) {
    customer = _customer
  }
})

test('create payment intent', async () => {
  const paymentIntent = await stripe.createPaymentIntent({
    amount: 100,
    customerId: customer.id,
    currency: PAYMENT_CURRENCY.HKD,
  })
  expect(paymentIntent?.client_secret).toBeDefined()
  expect(paymentIntent?.status).toBe('requires_payment_method')
})

test('create setupIntent and update customer', async () => {
  const setupIntent = await stripe.createSetupIntent({
    customerId: customer.id,
  })
  expect(setupIntent?.client_secret).toBeDefined()
  expect(setupIntent?.status).toBe('requires_payment_method')
})

test('createExpressAccount', async () => {
  const account = await stripe.createExpressAccount({
    user: testUser1,
    country: 'HongKong',
  })
  console.log(account)
  expect(account?.onboardingUrl).toBeDefined()

  const link = await stripe.createExpressLoginLink(account?.accountId as string)
  expect(link).toBeDefined()
})

test('transfer', async () => {
  const account = await stripe.createExpressAccount({
    user: testUser2,
    country: 'HongKong',
  })
  const transfer = await stripe.transfer({
    amount: 1,
    currency: PAYMENT_CURRENCY.HKD,
    recipientStripeConnectedId: account?.accountId as string,
    txId: 'testTxid',
  })
  expect(transfer?.id).toBeDefined()
})
