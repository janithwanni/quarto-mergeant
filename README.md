# Mergeant Extension For Quarto

Creates a small widget to keep track of edits to be made in articles locally.

## Installing

```bash
quarto add janithwanni/quarto-mergeant
```

This will install the extension under the `_extensions` subdirectory.
If you're using version control, you will want to check in this directory.

## Using

To use the extension simply add the extension as a filter to the qmd file.

```
---
title: "Mergeant Example"
filters:
  - mergeant
---
```

Once you preview the website, select any text to start annotating and the changes can be viewed from the bubble in the bottom right corner.

## Options

```yaml
mergeant:
  doc-id: my-paper-review       # optional, see below
  sync: local                   # or wss://your-sync-server
```

### `doc-id`

Annotations are stored in an [Automerge](https://automerge.org) document whose identity is decided when the page is rendered, not by the URL it is served from.
This means a local preview, a re-render on a different port and the published site all share the same annotations.

- If `doc-id` is set, it is used as the identity. Use this when sharing with collaborators, and pick something hard to guess when using a shared sync server.
- Otherwise the identity is derived from the file's path within the project and its title.

### `sync`

- `local` (default): annotations are kept in the browser (IndexedDB) and synced between tabs of the same browser. No server is needed.
  Browser storage is per origin, so give `quarto preview` a fixed port (`quarto preview --port 4200`) to keep seeing the same annotations between preview sessions.
- `wss://...`: also sync through an [automerge-repo](https://automerge.org/docs/repositories/) sync server, so reviewers on other machines see each other's annotations.
  A ready-to-deploy Cloudflare Worker (Durable Objects, free plan) lives in the `sync-worker` project; deploy it with `npx wrangler deploy` and use `sync: wss://mergeant-sync.<your-subdomain>.workers.dev`.

## Example

Here is the source code for a minimal example: [example.qmd](example.qmd).

