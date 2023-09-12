# Test Mode

this document describes hardcoded input value used by E2E testing

## emailLogin mutation

Emails matching the 'e2etest.*@matters.town' format will trigger test mode.

### OTP `CODE_EXPIRED` error

set `passwordOrCode` to `e2ets-loent-loent-loent-loent-expir`

### OTP `CODE_INVALID` error

set `passwordOrCode` to `e2ets-loent-loent-loent-loent-misma`

### OTP `UNKNOWN_ERROR` error

set `passwordOrCode` to `e2ets-loent-loent-loent-loent-unkno`

### register code `CODE_INVALID` error

set `passwordOrCode` to `e2etest_code_not_exists`

### register code `CODE_RETIRED` error

set `passwordOrCode` to `e2etest_code_retired`

### register code `CODE_EXPIRED` error

set `passwordOrCode` to `e2etest_code_expired`

### login / register successfully

any code except above values


## verifyEmail mutation

logined users with emails matching the 'e2etest.*@matters.town' format will trigger test mode.

### `CODE_INVALID` error

set `passwordOrCode` to `e2etest_code_not_exists`

### `CODE_RETIRED` error

set `passwordOrCode` to `e2etest_code_retired`

### `CODE_EXPIRED` error

set `passwordOrCode` to `e2etest_code_expired`

### verify successfully

any code except above values


## socialLogin / addSocialLogin mutations

authorizationCode matching the 'e2etest-.*' format will trigger test mode.

### `OAUTH_TOKEN_INVALID` error

set `authorizationCode` to `e2etest-invalid`

### `UNKNOWN_ERROR` error

set `authorizationCode` to `e2etest-unknown`

### success

any code matching the 'e2etest-.*' format but except above values
