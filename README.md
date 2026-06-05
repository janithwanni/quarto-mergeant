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

## Example

Here is the source code for a minimal example: [example.qmd](example.qmd).

