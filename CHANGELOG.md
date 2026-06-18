# Changelog

All notable changes to this project will be documented in this file.

## [2.3.0] - 2026-06-19
### Added
- Public release notes for `v2.3.0`.
- `CONTRIBUTING.md` with contribution guidelines.
- Updated `README.md` to show a concise public-facing project structure and index files.

### Highlights
- P2P Collaboration: Decentralized project sharing and granular read/write permissions.
- AI Integration: Core AI plumbing in `src/main/services/aiService.ts` (Google Gemini-ready).
- Community: Community chat feature (`src/renderer/src/features/Community/`) and `AIChatPanel` UI for context-aware developer assistance.
- Desktop App: Electron + Vite setup (`electron.vite.config.ts`) with Windows installer script (`installer.iss`).
- Renderer: React + Vite renderer — important entry points documented for clarity.

### Notes
- `src/renderer/src/lib/` is currently empty (reserved for shared utilities).
- AI provider credentials are not included; configure them in your environment.

---

*This changelog was generated automatically by the project maintainer assistant.*