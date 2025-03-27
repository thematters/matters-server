# Test Mode

this document describes hardcoded input value used by E2E testing

## emailLogin mutation

Emails matching the 'e2etest.*@matters.town' format will trigger test mode.

### OTP `CODE_EXPIRED` error

set `passwordOrCode` to `e2ets-loent-loent-loent-loent-expir`

### OTP `USER_PASSWORD_INVALID` error

set `passwordOrCode` to `e2ets-loent-loent-loent-loent-misma`

### OTP `UNKNOWN_ERROR` error

set `passwordOrCode` to `e2ets-loent-loent-loent-loent-unkno`

### register code `CODE_INVALID` error

set `passwordOrCode` to `e2etest-code-not-exists`

### register code `CODE_RETIRED` error

set `passwordOrCode` to `e2etest-code-retired`

### register code `CODE_EXPIRED` error

set `passwordOrCode` to `e2etest-code-expired`

### login / register successfully

any code except above values


## verifyEmail mutation

logined users with emails matching the 'e2etest.*@matters.town' format will trigger test mode.

### `CODE_INVALID` error

set `code` to `e2etest-code-not-exists`

### `CODE_RETIRED` error

set `code` to `e2etest-code-retired`

### `CODE_EXPIRED` error

set `code` to `e2etest-code-expired`

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
