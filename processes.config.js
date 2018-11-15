module.exports = {
  apps: [
    {
      name: 'graphql',
      script: 'build/index.js',
      watch: process.env['MATERIA_LOCALDEV'] ? 'build' : false
    }
  ]
}
