function Pandoc(doc)
	if not quarto.doc.is_format("html") then
		return doc
	end

	quarto.doc.add_html_dependency({
		name = "automerge",
		version = "0.0.1",
		scripts = { { path = "dist/index.js", attribs = { type = "module" } } },
		resources = { { name = "automerge.wasm", path = "dist/automerge.wasm" } },
	})

	return doc
end
