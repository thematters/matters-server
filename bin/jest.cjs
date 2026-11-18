const { spawnSync } = require('node:child_process')

const major = Number.parseInt(process.versions.node.split('.')[0], 10)
const args = ['--experimental-vm-modules']

if (major < 24) {
  args.push('--no-experimental-fetch')
}

args.push('node_modules/.bin/jest', ...process.argv.slice(2))

const result = spawnSync(process.execPath, args, {
  stdio: 'inherit',
  env: process.env,
})

if (result.error) {
  throw result.error
}

process.exit(result.status ?? 1)
