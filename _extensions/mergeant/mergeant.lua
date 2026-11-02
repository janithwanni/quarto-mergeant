-- Resolve a stable identity for this document so the same source file maps to
-- the same annotation doc regardless of the URL it is served from.
local function doc_key(meta, opts)
	local explicit = opts["doc-id"]
	if explicit then
		return pandoc.utils.sha1("id|" .. pandoc.utils.stringify(explicit))
	end

	local input = quarto.doc.input_file or ""
	local base = quarto.project.directory or pandoc.path.directory(input)
	local rel = pandoc.path.make_relative(input, base)
	local title = meta.title and pandoc.utils.stringify(meta.title) or ""
	return pandoc.utils.sha1("path|" .. rel .. "|" .. title)
end

function Pandoc(doc)
	if not quarto.doc.is_format("html") then
		return doc
	end

	local opts = doc.meta.mergeant or {}
	-- Lets a page opt out when the filter is enabled project-wide
	if opts.enabled == false then
		return doc
	end

	local sync = opts.sync and pandoc.utils.stringify(opts.sync) or "local"

	local config = quarto.json.encode({
		docKey = doc_key(doc.meta, opts),
		sync = sync,
	})
	quarto.doc.include_text(
		"in-header",
		'<script type="application/json" id="mergeant-config">' .. config .. "</script>"
	)

	quarto.doc.add_html_dependency({
		name = "automerge",
		version = "0.0.1",
		scripts = { { path = "dist/index.js", attribs = { type = "module" } } },
		resources = { { name = "automerge.wasm", path = "dist/automerge.wasm" } },
	})

	return doc
end
