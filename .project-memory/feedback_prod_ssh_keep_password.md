---
name: prod-ssh-keep-password-login
description: Prod VPS 103.77.182.93 must keep SSH password login enabled — never disable it; key login works alongside via `ssh prod`
metadata:
  type: feedback
---

On prod VPS 103.77.182.93 (/var/www/proxy, api.mktproxy.com), do NOT disable SSH password authentication or change PermitRootLogin. User explicitly refused on 2026-11-25. Key login (local ~/.ssh/id_ed25519, alias `ssh prod` in ~/.ssh/config) was added alongside password login.

**Why:** user wants to keep password access to the server.
**How to apply:** use `ssh prod` for read-only checks / DB queries; don't propose or perform sshd hardening that removes password login. Old VPS 103.70.13.118 is retired — ignore it.
