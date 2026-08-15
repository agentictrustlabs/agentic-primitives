# Support

## Start here

Most "bugs" against this substrate are one of two things:

1. **A registration step** — `redirect_not_registered`, "Request blocked" at the Home.
   → [docs/register-your-app.md](docs/register-your-app.md)
2. **A missing ceremony** — `storage_not_enabled`, `messaging_not_approved`, `read_grant_absent`.
   → [docs/troubleshooting.md](docs/troubleshooting.md). These are one signature at the person's
   Home. Your app cannot perform them, and neither can we.

## Diagnosing

```sh
pnpm check:endpoints    # are the live rails answering as documented?
pnpm check:packages     # do all 66 published packages still import?
```

If `check:endpoints` passes and your call still fails, the refusal is typed — look the `code` up
in [docs/interactions-api.md](docs/interactions-api.md) before filing anything.

## Filing an issue

Use the issue templates. Include the refusal `code`, the op, and whether `check:endpoints` passes.
An issue that says "409 on post" without the code is a round-trip we can both skip.

## Security

Never in a public issue — see [SECURITY.md](SECURITY.md).
