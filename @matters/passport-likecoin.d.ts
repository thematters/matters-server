declare module '@matters/passport-likecoin' {
  // copy from node_modules/@matters/passport-likecoin/index.d.ts
  import {
    Strategy,
    StrategyOptionsWithRequest,
    VerifyFunctionWithRequest,
  } from 'passport-oauth2'

  export default class LikeCoinStrategy extends Strategy {
    public constructor(
      options: StrategyOptionsWithRequest,
      verify: VerifyFunctionWithRequest
    )

    public name: string
  }
}
