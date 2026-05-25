(function () {
  "use strict";

  /* ─────────────────────────────────────────────
     1. AUTO-TAG: sections and paragraphs
  ───────────────────────────────────────────── */
  function autoTag() {
    const root =
      document.querySelector("main.content") ||
      document.querySelector("#quarto-content") ||
      document.body;

    let currentSection = "Preamble";
    let paraIndex = 0;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let node = walker.nextNode();

    while (node) {
      const tag = node.tagName.toLowerCase();

      if (/^h[1-4]$/.test(tag)) {
        currentSection =
          node.dataset.sectionLabel ||
          node.textContent.replace(/\s*#\s*$/, "").trim() ||
          currentSection;
        node = walker.nextNode();
        continue;
      }

      if (tag === "p" && !node.closest(".footnotes") && !node.closest(".author")) {
        paraIndex += 1;
        node.dataset.para = paraIndex;
        node.dataset.section = currentSection;
      }

      node = walker.nextNode();
    }

    // Tag Quarto section wrapper divs
    root.querySelectorAll("[class*='level'], section[id], div.section").forEach((div) => {
      const h = div.querySelector("h1, h2, h3, h4");
      if (h) div.dataset.section = h.textContent.replace(/\s*#\s*$/, "").trim();
    });
  }

  /* ─────────────────────────────────────────────
     2. TEXT-SEARCH RE-HIGHLIGHTER
     Finds the stored highlight string inside its
     paragraph using a TreeWalker over Text nodes.
     Handles text split across multiple child nodes.
     Tracks occurrenceIndex so duplicate phrases
     in the same paragraph are placed correctly.
  ───────────────────────────────────────────── */

  /**
   * Return an array of Range objects — one per occurrence of searchText
   * inside paraEl, spanning across text-node boundaries if needed.
   */
  function findTextRanges(paraEl, searchText) {
    const textNodes = [];
    const tw = document.createTreeWalker(paraEl, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = tw.nextNode())) textNodes.push(n);

    // Build a flat character map: combined[i] = { node, offset }
    const charMap = [];
    let combined = "";
    for (const tn of textNodes) {
      for (let i = 0; i < tn.nodeValue.length; i++) {
        charMap.push({ node: tn, offset: i });
        combined += tn.nodeValue[i];
      }
    }

    const results = [];
    let from = 0;
    while (from < combined.length) {
      const idx = combined.indexOf(searchText, from);
      if (idx === -1) break;
      const endIdx = idx + searchText.length - 1;
      if (charMap[idx] && charMap[endIdx]) {
        const range = document.createRange();
        range.setStart(charMap[idx].node, charMap[idx].offset);
        range.setEnd(charMap[endIdx].node, charMap[endIdx].offset + 1);
        results.push(range);
      }
      from = idx + 1;
    }
    return results;
  }

  /**
   * Re-apply a single stored annotation's highlight.
   * Returns true if the text was found and wrapped, false otherwise.
   */
  function reHighlight(annotation) {
    if (!annotation.paragraph) return false;
    const paraEl = document.querySelector(`[data-para="${annotation.paragraph}"]`);
    if (!paraEl) return false;

    const idx = annotation.occurrenceIndex ?? 0;
    const ranges = findTextRanges(paraEl, annotation.highlight);
    const range = ranges[idx];
    if (!range) return false;

    wrapRange(range, annotation.id);
    return true;
  }

  /**
   * Wrap a Range in a <mark>.
   * Uses surroundContents when possible; falls back to extractContents
   * for selections that cross element boundaries.
   */
  function wrapRange(range, id) {
    const mark = createMark(id);
    try {
      range.surroundContents(mark);
    } catch (_) {
      const fragment = range.extractContents();
      mark.appendChild(fragment);
      range.insertNode(mark);
    }
  }

  function createMark(id) {
    const mark = document.createElement("mark");
    mark.className = "anno-highlight";
    mark.dataset.annoId = id;
    mark.title = "Click to view annotation";
    mark.addEventListener("click", () => {
      openPanel();
      setTimeout(() => {
        const el = document.getElementById("ae-" + id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 100);
    });
    return mark;
  }

  /* ─────────────────────────────────────────────
     3. STYLES
  ───────────────────────────────────────────── */
  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .anno-highlight {
        background: #faeeda;
        border-bottom: 2px solid #ef9f27;
        cursor: pointer;
        border-radius: 2px;
      }
      #anno-popup {
        display: none; position: fixed; z-index: 99999;
        background: #fff; border: 1px solid #ddd; border-radius: 10px;
        box-shadow: 0 6px 24px rgba(0,0,0,0.13); padding: 14px 16px;
        width: 310px; font-family: system-ui, sans-serif; font-size: 13px; color: #111;
      }
      #anno-popup textarea {
        width: 100%; box-sizing: border-box; min-height: 72px; font-size: 13px;
        resize: vertical; border: 1px solid #ddd; border-radius: 6px;
        padding: 7px 9px; font-family: inherit; background: #f8f8f6; color: #111;
      }
      #anno-popup .popup-meta { font-size: 11px; color: #888; margin-bottom: 5px; }
      #anno-popup .popup-meta strong { color: #333; }
      #anno-popup .popup-quote {
        font-size: 12px; color: #666; background: #f5f5f0; border-radius: 5px;
        padding: 5px 8px; margin-bottom: 8px; font-style: italic;
        border-left: 2px solid #ef9f27;
      }
      #anno-popup .popup-btns { display: flex; gap: 8px; margin-top: 8px; }
      #anno-popup button {
        flex: 1; font-size: 13px; padding: 6px; border-radius: 6px;
        border: 1px solid #ccc; background: transparent; cursor: pointer; font-family: inherit;
      }
      #anno-popup #anno-save {
        background: #1a6fb5; color: #fff; border-color: #1a6fb5; font-weight: 500;
      }
      #anno-popup #anno-save:hover { background: #155fa0; }
      #anno-panel {
        position: fixed; bottom: 24px; right: 24px; z-index: 99998;
        width: 340px; background: #fff; border: 1px solid #ddd; border-radius: 12px;
        box-shadow: 0 6px 28px rgba(0,0,0,0.13);
        font-family: system-ui, sans-serif; font-size: 13px; color: #111;
        display: flex; flex-direction: column; max-height: 70vh;
      }
      #anno-panel-header {
        display: flex; align-items: center; gap: 8px; padding: 10px 14px;
        border-bottom: 1px solid #eee; cursor: pointer; user-select: none;
      }
      #anno-panel-header h4 { margin: 0; font-size: 13px; font-weight: 500; flex: 1; }
      #anno-panel-badge {
        background: #ef9f27; color: #fff; border-radius: 10px;
        font-size: 11px; padding: 1px 7px; font-weight: 600;
      }
      #anno-panel-toggle {
        font-size: 16px; color: #888; background: none;
        border: none; cursor: pointer; padding: 0; line-height: 1;
      }
      #anno-panel-body { overflow-y: auto; padding: 10px 14px; flex: 1; }
      .anno-entry {
        border-left: 3px solid #ef9f27; padding: 6px 10px; margin-bottom: 8px;
        background: #fafaf8; border-radius: 0 6px 6px 0;
      }
      .anno-entry.anno-missing { border-left-color: #ccc; opacity: 0.65; }
      .anno-entry .e-meta { font-size: 11px; color: #888; margin-bottom: 3px; }
      .anno-entry .e-meta strong { color: #444; }
      .anno-entry .e-quote { font-style: italic; color: #666; font-size: 12px; }
      .anno-entry .e-comment { color: #111; margin-top: 4px; font-size: 12px; }
      .anno-entry .e-missing {
        font-size: 11px; color: #e07b39; margin-top: 3px; font-style: italic;
      }
      .anno-entry .e-del {
        float: right; background: none; border: none; cursor: pointer;
        color: #bbb; font-size: 15px; line-height: 1; padding: 0; margin-left: 6px;
      }
      .anno-entry .e-del:hover { color: #c0392b; }
      #anno-panel-footer {
        padding: 8px 14px; border-top: 1px solid #eee; display: flex; gap: 6px;
      }
      #anno-panel-footer button {
        flex: 1; font-size: 12px; padding: 5px 8px; border-radius: 6px;
        border: 1px solid #ccc; background: transparent; cursor: pointer; font-family: inherit;
      }
      #anno-panel-footer button:hover { background: #f0f0ec; }
      .anno-empty { text-align: center; color: #aaa; font-size: 12px; padding: 16px 0; }
      #anno-fab {
        position: fixed; bottom: 24px; right: 24px; z-index: 99997;
        background: #1a6fb5; color: #fff; border: none; border-radius: 50%;
        width: 48px; height: 48px; font-size: 22px; cursor: pointer;
        box-shadow: 0 4px 16px rgba(0,0,0,0.18);
        display: flex; align-items: center; justify-content: center; line-height: 1;
      }
      #anno-fab:hover { background: #155fa0; }
      #anno-hint {
        position: fixed; bottom: 80px; right: 24px; z-index: 99997;
        background: #333; color: #fff; font-family: system-ui, sans-serif;
        font-size: 12px; padding: 6px 12px; border-radius: 6px;
        opacity: 0; pointer-events: none; transition: opacity 0.3s;
      }
    `;
    document.head.appendChild(style);
  }

  /* ─────────────────────────────────────────────
     4. STORAGE
  ───────────────────────────────────────────── */
  const STORE_KEY = "quarto_annotations_v1";
  let annotations = [];

  function loadStore() {
    try { annotations = JSON.parse(localStorage.getItem(STORE_KEY) || "[]"); }
    catch (_) { annotations = []; }
  }

  function saveStore() {
    localStorage.setItem(STORE_KEY, JSON.stringify(annotations));
  }

  /* ─────────────────────────────────────────────
     5. RE-APPLY ALL STORED HIGHLIGHTS
  ───────────────────────────────────────────── */
  function reApplyAllHighlights() {
    annotations.forEach((a) => {
      a._missing = !reHighlight(a); // _missing is runtime-only, not persisted
    });
  }

  /* ─────────────────────────────────────────────
     6. BUILD UI
  ───────────────────────────────────────────── */
  let panelOpen = false;

  function buildUI() {
    // Popup
    const popup = document.createElement("div");
    popup.id = "anno-popup";
    popup.setAttribute("role", "dialog");
    popup.setAttribute("aria-label", "Add annotation");
    popup.innerHTML = `
      <div class="popup-meta">
        Section: <strong id="popup-section">—</strong>
        &nbsp;·&nbsp; ¶<strong id="popup-para">—</strong>
      </div>
      <div class="popup-quote" id="popup-quote"></div>
      <textarea id="anno-comment" placeholder="Your comment… (Ctrl+Enter to save)"></textarea>
      <div class="popup-btns">
        <button id="anno-cancel">Cancel</button>
        <button id="anno-save">Save</button>
      </div>
    `;
    document.body.appendChild(popup);

    // FAB
    const fab = document.createElement("button");
    fab.id = "anno-fab";
    fab.title = "Show annotations";
    fab.innerHTML = "💬";
    fab.setAttribute("aria-label", "Toggle annotations panel");
    document.body.appendChild(fab);

    // Hint toast
    const hint = document.createElement("div");
    hint.id = "anno-hint";
    document.body.appendChild(hint);

    // Side panel
    const panel = document.createElement("div");
    panel.id = "anno-panel";
    panel.style.display = "none";
    panel.innerHTML = `
      <div id="anno-panel-header">
        <h4>📝 Annotations</h4>
        <span id="anno-panel-badge">0</span>
        <button id="anno-panel-toggle" aria-label="Collapse panel">▾</button>
      </div>
      <div id="anno-panel-body"></div>
      <div id="anno-panel-footer">
        <button id="btn-json">⬇ JSON</button>
        <button id="btn-csv">⬇ CSV</button>
        <button id="btn-clear" style="color:#c0392b">🗑 Clear all</button>
      </div>
    `;
    document.body.appendChild(panel);

    // Wire events
    fab.addEventListener("click", openPanel);
    document.getElementById("anno-panel-toggle").addEventListener("click", closePanel);
    document.getElementById("anno-cancel").addEventListener("click", cancelPopup);
    document.getElementById("anno-save").addEventListener("click", saveAnnotation);
    document.getElementById("anno-comment").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.ctrlKey) saveAnnotation();
      if (e.key === "Escape") cancelPopup();
    });
    document.getElementById("btn-json").addEventListener("click", exportJSON);
    document.getElementById("btn-csv").addEventListener("click", exportCSV);
    document.getElementById("btn-clear").addEventListener("click", clearAll);
    document.addEventListener("mousedown", (e) => {
      if (
        popup.style.display === "block" &&
        !popup.contains(e.target) &&
        !e.target.closest(".anno-highlight")
      ) cancelPopup();
    });

    renderPanel();
  }

  function openPanel() {
    panelOpen = true;
    document.getElementById("anno-fab").style.display = "none";
    document.getElementById("anno-panel").style.display = "flex";
  }

  function closePanel() {
    panelOpen = false;
    document.getElementById("anno-panel").style.display = "none";
    document.getElementById("anno-fab").style.display = "flex";
  }

  /* ─────────────────────────────────────────────
     7. SELECTION → SAVE
  ───────────────────────────────────────────── */
  let pending = null;

  document.addEventListener("mouseup", handleSelect);
  document.addEventListener("touchend", handleSelect);

  function handleSelect(e) {
    if (e.target.closest("#anno-popup, #anno-panel, #anno-fab, #anno-hint")) return;

    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) return;

      const text = sel.toString().trim();
      const range = sel.getRangeAt(0);
      const anchor = range.commonAncestorContainer;
      const el = anchor.nodeType === 3 ? anchor.parentElement : anchor;
      const paraEl = el.closest("[data-para]");
      const sectEl = el.closest("[data-section]");

      // Determine which occurrence of this text the user selected
      let occurrenceIndex = 0;
      if (paraEl) {
        const allRanges = findTextRanges(paraEl, text);
        for (let i = 0; i < allRanges.length; i++) {
          if (
            allRanges[i].startContainer === range.startContainer &&
            allRanges[i].startOffset === range.startOffset
          ) { occurrenceIndex = i; break; }
        }
      }

      pending = {
        text,
        range: range.cloneRange(),
        section: sectEl ? sectEl.dataset.section : "—",
        para: paraEl ? parseInt(paraEl.dataset.para) : null,
        occurrenceIndex,
      };

      showPopup(e);
    }, 30);
  }

  function showPopup(e) {
    document.getElementById("popup-section").textContent = pending.section;
    document.getElementById("popup-para").textContent = pending.para || "—";
    const qt = pending.text.length > 90 ? pending.text.slice(0, 90) + "…" : pending.text;
    document.getElementById("popup-quote").textContent = "\u201c" + qt + "\u201d";
    document.getElementById("anno-comment").value = "";

    const px = Math.min(
      (e.clientX || (e.changedTouches && e.changedTouches[0].clientX) || 200),
      window.innerWidth - 330
    );
    const py = Math.min(
      (e.clientY || (e.changedTouches && e.changedTouches[0].clientY) || 200) + 14,
      window.innerHeight - 220
    );
    const popup = document.getElementById("anno-popup");
    popup.style.left = px + "px";
    popup.style.top = py + "px";
    popup.style.display = "block";
    document.getElementById("anno-comment").focus();
  }

  function cancelPopup() {
    document.getElementById("anno-popup").style.display = "none";
    pending = null;
    window.getSelection()?.removeAllRanges();
  }

  function saveAnnotation() {
    if (!pending) return;
    const comment = document.getElementById("anno-comment").value.trim();
    const entry = {
      id: Date.now(),
      section: pending.section,
      paragraph: pending.para,
      occurrenceIndex: pending.occurrenceIndex,
      highlight: pending.text,
      comment,
      timestamp: new Date().toISOString(),
      url: location.href,
    };
    annotations.push(entry);
    saveStore();
    wrapRange(pending.range, entry.id);
    cancelPopup();
    renderPanel();
    if (!panelOpen) flashFab();
  }

  function flashFab() {
    const hint = document.getElementById("anno-hint");
    const fab = document.getElementById("anno-fab");
    hint.textContent = "Annotation saved!";
    hint.style.opacity = "1";
    fab.style.transform = "scale(1.15)";
    setTimeout(() => { hint.style.opacity = "0"; fab.style.transform = ""; }, 1800);
  }

  /* ─────────────────────────────────────────────
     8. PANEL RENDERING
  ───────────────────────────────────────────── */
  function renderPanel() {
    document.getElementById("anno-panel-badge").textContent = annotations.length;
    const body = document.getElementById("anno-panel-body");
    if (!annotations.length) {
      body.innerHTML = '<p class="anno-empty">No annotations yet.<br>Select text to begin.</p>';
      return;
    }
    body.innerHTML = annotations
      .slice().reverse()
      .map((a) => `
        <div class="anno-entry${a._missing ? " anno-missing" : ""}" id="ae-${a.id}">
          <button class="e-del" data-id="${a.id}" aria-label="Delete">\u00d7</button>
          <div class="e-meta">
            <strong>${a.section}</strong>${a.paragraph ? " \u00b7 \u00b6" + a.paragraph : ""}
            <span style="float:right;font-size:10px;color:#bbb">${new Date(a.timestamp).toLocaleString()}</span>
          </div>
          <div class="e-quote">\u201c${a.highlight.length > 100 ? a.highlight.slice(0, 100) + "\u2026" : a.highlight}\u201d</div>
          ${a.comment ? `<div class="e-comment">${a.comment}</div>` : ""}
          ${a._missing ? `<div class="e-missing">\u26a0 Text not found \u2014 document may have changed</div>` : ""}
        </div>
      `).join("");

    body.querySelectorAll(".e-del").forEach((btn) => {
      btn.addEventListener("click", () => deleteAnno(Number(btn.dataset.id)));
    });
  }

  function deleteAnno(id) {
    annotations = annotations.filter((a) => a.id !== id);
    saveStore();
    const mark = document.querySelector(`mark[data-anno-id="${id}"]`);
    if (mark) {
      const p = mark.parentNode;
      while (mark.firstChild) p.insertBefore(mark.firstChild, mark);
      p.removeChild(mark);
    }
    renderPanel();
  }

  function clearAll() {
    if (!confirm("Delete all annotations from this page?")) return;
    annotations = []; saveStore();
    document.querySelectorAll(".anno-highlight").forEach((m) => {
      const p = m.parentNode;
      while (m.firstChild) p.insertBefore(m.firstChild, m);
      p.removeChild(m);
    });
    renderPanel();
  }

  /* ─────────────────────────────────────────────
     9. EXPORT
  ───────────────────────────────────────────── */
  function exportJSON() {
    const clean = annotations.map(({ _missing, ...rest }) => rest);
    dl(new Blob([JSON.stringify(clean, null, 2)], { type: "application/json" }), "annotations.json");
  }

  function exportCSV() {
    const cols = ["id", "section", "paragraph", "occurrenceIndex", "highlight", "comment", "timestamp", "url"];
    const rows = annotations.map((a) =>
      cols.map((k) => '"' + String(a[k] ?? "").replace(/"/g, '""') + '"').join(",")
    );
    dl(new Blob([[cols.join(","), ...rows].join("\n")], { type: "text/csv" }), "annotations.csv");
  }

  function dl(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  /* ─────────────────────────────────────────────
     10. BOOT — order matters:
     autoTag first so data-para exists,
     then reApplyAllHighlights before buildUI
     so panel renders correct state immediately.
  ───────────────────────────────────────────── */
  function boot() {
    injectStyles();
    autoTag();
    loadStore();
    reApplyAllHighlights();
    buildUI();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
