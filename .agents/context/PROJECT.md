# PROJECT.md — What & Why

> Read this when: you need to understand _why this repo exists_, who it serves,
> what "good" looks like. Skip if you already know the product and just need to
> code.

## TL;DR

Melodix is a **modern, motion-rich music streaming experience** that lives in
two places at once: a polished Next.js web app and a Telegram Mini App. The
backend brokers Creative-Commons music from Jamendo, with a built-in demo
catalog so the product can be demoed end-to-end without any external API key.

## Vision

> _"Where every beat finds you."_ — a Spotify-class listening UI built around
> motion design, available wherever the listener already is — including inside
> Telegram chats.

## Positioning

|                    |                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------ |
| **Like**           | Spotify, Zing MP3, Apple Music                                                                               |
| **Inspired by**    | motionsites.ai, Vercel's gallery, contemporary motion design                                                 |
| **Differentiator** | Same library, two surfaces (Web + Telegram Mini App) with theme-synced UX, all on a Creative-Commons catalog |
| **Catalog**        | Jamendo (Creative-Commons), with extensibility for FMA / direct upload sources                               |

## Audiences

- **Music listeners** who want a beautiful, free music experience.
- **Telegram-native users** who prefer to consume content inside chats.
- **Indie artists** distributing under Creative-Commons (future: direct upload).
- **Developers / motion-design enthusiasts** browsing the codebase as a reference for "Spotify-class UI in 2025".

## Product principles

1. **Motion first, but never in the way of the music.** Animations enhance, never block playback.
2. **One library, two surfaces.** Web and Mini App share types, components, and behaviour wherever possible.
3. **Demo-safe by default.** The app boots and works fully without any third-party credentials.
4. **Type-safe end-to-end.** `@melodix/shared` is the single source of truth for domain types.
5. **Respect the source.** Jamendo / Creative-Commons attribution must be preserved.

## Success criteria (what "done" looks like)

- A new user can land on the homepage and have audio playing within 5 seconds, no login required.
- The same Telegram user can resume listening on the Mini App with their library state intact.
- All flows (browse, search, play, like, playlist) work in **demo mode** with zero external dependencies.
- Lighthouse Performance ≥ 90 on the web app's homepage.
- CI green: `typecheck`, `lint`, `build` all pass.

## Out of scope (today)

- DRM / non-Creative-Commons catalog ingestion.
- Native iOS / Android apps (the Mini App + responsive web cover mobile for now).
- Server-side audio transcoding (we stream what Jamendo serves).
- Social graph features beyond per-user likes/playlists (no "follow", "share-to-feed", etc. — yet).

See [`ROADMAP.md`](ROADMAP.md) for what we _do_ plan to build.
