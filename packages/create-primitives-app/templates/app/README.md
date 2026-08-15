# @app/web

Your product. One Cloudflare Worker + a React SPA. No database.

Connect, session cookies, org wires, and contract display are already wired in
`src/worker/index.ts`. Add features there. Records go in the owner's vault.

```sh
cp .dev.vars.example .dev.vars
pnpm dev
```

Register `CLIENT_ID` at your Home before the first sign-in — `docs/register-your-app.md`.
