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

### Annotations

- **Your name**: the first time you annotate, enter your name in the popup. It is remembered in your browser and shown next to your comments and replies, and you can change it from the "Commenting as" field in the panel.
- **Replies**: use _Reply_ on an annotation to discuss it with the writer or other reviewers.
- **Edit and delete**: _Edit_ changes a comment's text; _Delete_ removes the annotation and its replies.
- **Resolve**: once a comment has been addressed, _Resolve_ it. Resolved highlights turn green and dashed, and _Reopen_ brings them back.
- **Filter and sort**: the _Open_ / _Resolved_ / _All_ tabs filter the list, and it can be sorted in document order or newest first. The bubble shows how many annotations are still open.
- **Jump to the text**: click a quote in the panel to scroll to its highlight, or click a highlight to find its entry in the panel.
- **Hide highlights**: the ◉ button in the panel header hides highlight styling so the page can be read clean.
- **Sync status**: the panel header shows _Local_ (browser only), _Synced_ (connected to the sync server) or _Offline_ (changes are kept in the browser and sent on reconnect).
- **Export**: download the annotations as a Markdown checklist grouped by section (handy as a to-do list for the writer), JSON or CSV.
- **Clear**: deletes the annotations shown in the current tab, e.g. switch to _Resolved_ to clean up addressed comments.

Ctrl+Enter (⌘+Enter on a Mac) saves a comment, reply or edit, and Escape cancels.

If a paragraph's text changes so that a highlight can no longer be found, its annotation is greyed out with a warning but kept.
When paragraphs are added or removed above an annotation, the highlight is found again by its text as long as that text appears only once on the page.

### Review status

The ☑ button in the bottom left corner opens a list of the page's sections and their paragraphs.
Click a section's pill, or a paragraph, to cycle its status through _Unset_ → _Done_ → _In progress_ → _Incomplete_.
Marked sections and paragraphs get a coloured bar in the left margin of the page, and the panel footer shows how many are done.
Sections and paragraphs with open annotations show a 💬 count, and the ↗ button scrolls the page to that section or paragraph.

Statuses are stored and synced alongside the annotations, so the `sync` and `doc-id` options apply to them too.
They are tied to the order of headings and paragraphs on the page, so adding or removing a heading or paragraph above one can move its status to a neighbour.

## Tutorial: setting up the filter for different scenarios

Each scenario below builds on the previous one, so start at the first and stop once your setup is covered.
The options used here are described in full under [Options](#options).

### 1. A single document, reviewed by yourself

The simplest setup: one `.qmd` file and annotations that stay in your own browser.

1. Install the extension next to your document:

   ```bash
   quarto add janithwanni/quarto-mergeant
   ```

2. Add the filter to the document's YAML header:

   ```yaml
   ---
   title: "My Paper"
   format: html
   filters:
     - mergeant
   ---
   ```

3. Preview the document on a fixed port:

   ```bash
   quarto preview my-paper.qmd --port 4200
   ```

   Annotations are stored in browser storage, which is tied to the address of the page (including the port).
   Without `--port`, Quarto may pick a different port each time and your earlier annotations will seem to disappear.

4. Select some text in the rendered page, add a comment, and open the bubble in the bottom right corner to see your annotations.

`sync: local` is the default, so it does not need to be written out.

### 2. Every page of a website, book or manuscript project

For a project with a `_quarto.yml`, you can turn on the filter for every page at once instead of editing each file.

1. Install the extension in the project root (the folder that holds `_quarto.yml`).

2. Add the filter to `_quarto.yml`:

   ```yaml
   project:
     type: website

   filters:
     - mergeant
   ```

   To enable it for only part of the project, put the same `filters:` entry in a `_metadata.yml` file inside that folder (for example `chapters/_metadata.yml`) instead.

3. Preview the project on a fixed port:

   ```bash
   quarto preview --port 4200
   ```

Each page gets its own set of annotations, identified by the file's path in the project and its title.

**Do not** set `doc-id` in `_quarto.yml` or `_metadata.yml`: every page would then share a single set of annotations.

### 3. Keeping annotations when a file is renamed or retitled

By default the annotation identity comes from the file's path and title, so moving the file or changing its `title` starts a fresh, empty set of annotations.
To keep them stable, give the document an explicit `doc-id`:

```yaml
---
title: "My Paper"
filters:
  - mergeant
mergeant:
  doc-id: my-paper-review
---
```

Set `doc-id` before you start annotating.
Adding or changing it later switches the page to a different set of annotations; the old ones stay in the browser but are no longer shown.

### 4. Reviewing with collaborators on other machines

To let several people annotate the same document and see each other's comments, connect the filter to a sync server.

1. Deploy a sync server.
   The `sync-worker` project contains a Cloudflare Worker that runs on the free plan:

   ```bash
   cd sync-worker
   npx wrangler deploy
   ```

   Note the URL it prints, e.g. `https://mergeant-sync.<your-subdomain>.workers.dev`.

2. Point the document at the server, using `wss://` in place of `https://`, and give it a hard-to-guess `doc-id`:

   ```yaml
   ---
   title: "My Paper"
   filters:
     - mergeant
   mergeant:
     doc-id: my-paper-review-7f3k9q2x
     sync: wss://mergeant-sync.<your-subdomain>.workers.dev
   ---
   ```

   Anyone who knows the `doc-id` and the server address can read and add annotations, so treat the `doc-id` like a shared password.

3. Render and publish the document somewhere your collaborators can open it (for example `quarto publish gh-pages`), or send them the source so they can preview it themselves.

Because the identity is fixed when the page is rendered, your local preview and the published copy share the same annotations.
Annotations are still saved in each browser too, so reviewers can keep working offline and their changes are merged when they reconnect.

### 5. Documents with several output formats

The filter only does anything for HTML output, so it is safe to leave in documents that also render to PDF or Word:

```yaml
---
title: "My Paper"
format:
  html: default
  pdf: default
filters:
  - mergeant
---
```

The HTML version gets the annotation widget; the PDF is rendered as if the filter were not there.

### 6. Turning annotations on only while reviewing

If you want the widget during review but not in the final published version, use a [Quarto project profile](https://quarto.org/docs/projects/profiles.html).

1. Leave `filters` and `mergeant` out of `_quarto.yml`.

2. Create `_quarto-review.yml` next to it with the review settings:

   ```yaml
   filters:
     - mergeant

   mergeant:
     sync: wss://mergeant-sync.<your-subdomain>.workers.dev
   ```

   Keep per-document `doc-id`s in each document's header, not here (see scenario 2).

3. Render or preview with the profile when reviewing, and without it for the final version:

   ```bash
   quarto preview --profile review --port 4200   # with annotations
   quarto render                                 # final version, no widget
   ```

## Options

```yaml
mergeant:
  doc-id: my-paper-review       # optional, see below
  sync: local                   # or wss://your-sync-server
  enabled: true                 # set to false to turn the widget off for a page
```

### `enabled`

Set `enabled: false` in a document's header to leave out the widget on that page, e.g. when the filter is turned on for a whole project in `_quarto.yml`.

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

