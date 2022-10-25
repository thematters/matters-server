import { CurationContract } from 'connectors/blockchain'

describe('curationContract', () => {
  test('compute topics correctly', async () => {
    const curation = new CurationContract()
    expect(curation.erc20TokenCurationEventTopic).toBe('0xc2e41b3d49bbccbac6ceb142bad6119608adf4f1ee1ca5cc6fc332e0ca2fc602')
    expect(curation.nativeTokenCurationEventTopic).toBe('0xd7dc0722e6bc9987e505da6eb6e28fb6cab480d622b478011168976231055694')
  })
  test.skip('fetchLogs correctly', async () => {
    jest.setTimeout(0)
    const curation = new CurationContract()
    const logs = await curation.fetchLogs()
    console.log(logs)
  })
  test.skip('fetchTxReceipt correctly', async () => {
    jest.setTimeout(0)
    const curation = new CurationContract()
    const erc20Receipt = await curation.fetchTxReceipt('0x1764d50fb01e04350248f6a4e30dff3839880f50af26de3e0b78657a46c4118f')
    const nativeTokenReceipt = await curation.fetchTxReceipt('0xedacfa988eb2aa3c491cb77029ca44fd1a94ae28b685133b7b017febe864ecd2')
    console.log(erc20Receipt)
    console.log(nativeTokenReceipt)
  })
})
