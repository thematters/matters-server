## Basic
a. Never speculate. Investigate and confirm the facts before writing any code.
b. Related Matters repositories for reference are at https://github.com/orgs/thematters/repositories
c. If a requirement is ambiguous, or the existing architecture cannot solve the problem elegantly, ask the
   developer first instead of modifying core low-level modules on your own.


## Development
a. TypeScript is the primary language.
b. Prefer arrow functions. Avoid TypeScript generic type parameters where a concrete type works.
c. Do not write an if-else on a single line.
d. Write comments in English and only on the important parts. Keep them short and clear; avoid over-commenting.
e. After every change, re-run lint and format to keep quality and style consistent.
f. After every change, add or update the relevant test cases and run the tests to make sure they pass.
g. Install non-essential packages as devDependencies, such as lint, format, build, test and tooling
   packages like eslint and codecov; keep runtime dependencies minimal.


## Error handling
a. Always throw the named error classes defined in common/errors, such as ForbiddenError, UserNotFoundError,
   EmailInvalidError.
b. Do not throw strings or a generic Error. Add a new class only when none fits, to keep error codes consistent.
c. When an error occurs, besides throwing from common/errors, log it with the logger.


## Data access
a. Do not write knex or raw SQL directly in a resolver; access data through the services in context.dataSources.
b. Load list fields via the matching DataLoader to avoid N+1; never query row by row inside a loop.
c. Wrap multi-write operations that need atomicity in an atomService transaction.


## Pagination
a. Return connection fields with connectionFromArray, connectionFromPromisedArray and cursorToIndex,
   following the Relay cursor spec.
b. Annotate connection fields with @complexity(multipliers input.first) to bound query complexity and
   avoid over-fetching.


## Constants and async
a. Use the constants in common/enums for roles, states and types, such as USER_ROLE, USER_STATE and
   NODE_TYPES; do not use magic strings.
b. Offload heavy tasks such as sending email, on-chain calls and notifications to the queue; do not await
   them synchronously inside a resolver.


## Security
a. Never hardcode passwords, API keys or any sensitive information in the code.


## Git
a. General feature development and fixes
  a1. Branch off the develop branch and make changes on that branch.
  a2. Before git push, sync with develop so conflicts are found and resolved first.
  a3. When conflicts appear, do not revert on your own even if you are sure the revert is safe; ask the
      developer first.
b. Hotfix
  b1. If the change is based on the master branch, cherry-pick it onto the develop branch.
c. Commit message
  c1. Follow Conventional Commits, such as feat:, fix: and docs:.
