# Vendored package override

This directory is a temporary bridge for G2-A federation export work.

`matters-ipns-site-generator-0.1.9.tgz` is the package tarball produced from
the local `@matters/ipns-site-generator` 0.1.9 release branch. It is vendored
because npm publishing for the `@matters` scope requires maintainer access that
was not available during this preflight.

Remove this tarball and change `package.json` back to a registry dependency
after `@matters/ipns-site-generator@0.1.9` is published to npm:

```json
"@matters/ipns-site-generator": "^0.1.9"
```
