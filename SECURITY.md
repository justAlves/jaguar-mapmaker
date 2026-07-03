# Security Policy

*[Português](SECURITY.pt-BR.md) · [Español](SECURITY.es.md)*

## Supported versions

Jaguar doesn't yet have tagged releases; security fixes are only supported against the latest code on the default branch. Once versioned releases exist, this section will be updated to reflect which versions receive patches.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Instead, use GitHub's private vulnerability reporting for this repository (the **Security** tab → **Report a vulnerability**). This opens a private conversation with the maintainers without disclosing details publicly before a fix is available.

When reporting, please include:

- A description of the issue and its potential impact
- Steps to reproduce (or a proof of concept, if applicable)
- The affected platform(s) (Windows/macOS/Linux) if relevant

We'll do our best to acknowledge reports promptly and keep you updated as the issue is investigated and fixed.

## Scope and context

Jaguar is a local-first desktop application built with Tauri:

- It has no backend, no user accounts, and does not transmit any data over the network. It doesn't collect telemetry or analytics.
- It reads/writes files only within folders you explicitly choose (via native file/folder dialogs) for your projects and their imported assets.
- The main relevant attack surface is therefore the Tauri shell's filesystem capabilities and any third-party dependency (npm/Cargo crates) — dependency vulnerabilities are welcome reports too, even if the practical exploit path is unclear.
