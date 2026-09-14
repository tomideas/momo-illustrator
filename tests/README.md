# Regression checks

Run with Node.js, without Illustrator or third-party packages:

```sh
node --test tests/regression.cjs
```

The tests execute the production panel functions with isolated storage, DOM and Illustrator doubles. They cover immediate note saves, tab changes, display recovery, damaged/failed storage, original color serialization, spot tint and definition conflicts, and late preview callbacks. They do not establish native CEP rendering reliability or ICC equivalence.

Before releasing, verify in foreground Illustrator:

- Notes: open, edit, switch/close/reorder tabs, hide/show and restart. Check content and both backup files. Repeat docked/floating and across display scales. Explicitly opening a 1×1 viewport should request size recovery without reloading editor content.
- CMYK document: extract fractional CMYK and a four-ink gray, save, restart, apply to a second object, then read the native channels again. Compare the original DOM channels without rounding.
- RGB document: repeat with RGB 78/156/207. The source and applied RGB must agree; saved HEX must remain 4E9CCF.
- Spot/global color: repeat at 20% tint, including a same-name/different-definition destination. Preserve the definition and tint, and reject conflicts without altering existing swatches.
- Cross-mode documents: confirm Illustrator performs conversion and the panel reports it. Exact channel equality is only expected within the same color space.

Keep Illustrator in the foreground when creating/closing temporary test documents: on macOS the host can wait for foreground interaction even when `DONOTSAVECHANGES` is specified. Do not force-quit Illustrator to interrupt this wait.
