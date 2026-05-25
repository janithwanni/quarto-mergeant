function Meta(meta)
	quarto.doc.add_html_dependency({
		name = "mergeant",
		version = "0.0.1",
		scripts = { "mergeant.js" },
	})
	return meta
end
