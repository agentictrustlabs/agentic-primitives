# Canonical developer skills

These are representative **build-time developer skills**. A real release should generate compatibility metadata and resource links from the release manifest.

Runtime operational skills belong in the canonical skills/runtime or application repository and should be installed only when their required tools and authority pipeline are available.

Run:

```bash
node scripts/sync-skills.mjs
```

to generate `.agents/skills`, `.claude/skills`, and `.cursor/skills` copies.
