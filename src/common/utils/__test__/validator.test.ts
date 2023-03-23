import { isValidTransactionHash } from 'common/utils/index.js'

test('isValidTransactionHash', async () => {
  const badTxHash1 = 'badTxHash'
  const badTxHash2 =
    '0xd65dc6bf6dcc111237f9acfbfa6003ea4a4d88f2e071f4307d3af81ae877f7b'
  const badTxHash3 =
    'd65dc6bf6dcc111237f9acfbfa6003ea4a4d88f2e071f4307d3af81ae877f7be'
  const goodTxHash1 =
    '0xd65dc6bf6dcc111237f9acfbfa6003ea4a4d88f2e071f4307d3af81ae877f7be'
  const goodTxHash2 =
    '0xd65dc6bf6dcc111237f9acfbfa6003ea4a4d88f2e071f4307d3af81ae877f7bE'
  expect(isValidTransactionHash(badTxHash1)).toBeFalsy()
  expect(isValidTransactionHash(badTxHash2)).toBeFalsy()
  expect(isValidTransactionHash(badTxHash3)).toBeFalsy()
  expect(isValidTransactionHash(goodTxHash1)).toBeTruthy()
  expect(isValidTransactionHash(goodTxHash2)).toBeTruthy()
})
