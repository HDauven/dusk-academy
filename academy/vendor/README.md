# Locally bundled Dusk Connect

`dusk-connect.js` is the browser root entrypoint from the official
https://github.com/dusk-network/connect repository, pinned to commit
`67b37ab0969bd42bf2b8d95f7b610cb654e49be8` (package metadata: 0.2.0).
This identifies the exact source, not a claim that the checkout is a published release.
The root entrypoint has no runtime dependencies; optional typed-data/BLS entrypoints are not bundled.
See `dusk-connect.LICENSE` (MIT).

Reproduce from that checkout:

```sh
npx --yes --package=esbuild@0.25.12 esbuild /path/to/connect/src/index.ts \
  --bundle --format=esm --platform=browser --target=es2022 --minify \
  --legal-comments=eof --outfile=academy/vendor/dusk-connect.js
```

No CDN, package registry or build tool is contacted by learners' browsers.
