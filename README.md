# Milo

A workout app being rebuilt around one loop: open, train, finish.

This branch deliberately shows only Today, the current exercise, and a finish
summary. Saved workouts and history remain intact. The existing program and
progression engine are provisional; they have not been replaced with a new method.

```sh
npm install
npm start
```

Checks: `npm run typecheck` and `npm test`.

Read `PRODUCT.md` for the current scope, `DESIGN.md` for interface rules, and
`REDESIGN.md` for implementation boundaries and verification gaps. Earlier interfaces
are recoverable through `ARCHIVE.md`.
