# Security Policy

## Supported versions

Only the latest release receives security fixes.

| Version | Supported |
|---|---|
| latest | ✅ |
| older | ❌ |

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Report privately by emailing: **yakirva4@gmail.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact

You will receive a response within 7 days. If confirmed, a fix will be released as soon as possible.

## Security notes

- The app runs entirely in the browser — no backend, no server-side code, no external network calls at runtime
- File access requires explicit user permission via the browser's File System Access API (Chrome/Edge)
- Docker image is scanned with [Trivy](https://github.com/aquasecurity/trivy) on every release; results are published to the GitHub Security tab
