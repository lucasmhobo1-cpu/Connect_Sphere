---
name: Vite dependency prebundle cache
description: Environment lesson about stale optimized dependency output after pnpm changes.
---

When a dependency installation succeeds but the running Vite app still loads an older React or module build, check whether generated Vite optimized dependencies are stale before changing application code.

**Why:** A stale optimizer cache can mask the dependency version actually installed in the workspace.

**How to apply:** Compare the installed package tree with the modules the browser loads; clear only generated Vite cache data and restart when a mismatch is confirmed.
