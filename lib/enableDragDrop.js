
(function() {
	var doiRegex = '(10[.][0-9]{4,}(?:[.][0-9]+)*/(?:(?![%"#? ])\\S)+)'
	var doiTextPrefix = 'doi\\:'

	var doi = function (opts) {
	opts = opts || {}
	return opts.exact ? new RegExp('(?:^' + doiRegex + '$)') :
						new RegExp('(?:' + doiRegex + ')', 'g')
	}

	doi.groups = function (str) {
	if (!str) { return }
	// Javascript fails at lookaheads for optional groups. This circumvents that
	// problem by just automatically removing and saving suffixes if they are in
	// as specific format - .a000 is the format used by PLoS, but this may need
	// to be filled out.
	var suffixes = []
	var newStr = str.replace(/\.[a-zA-Z]{1}[0-9]{3}$/g, function (s) {
		suffixes.push(s)
		return ''
	})
	var match = doi().exec(newStr)
	if (match) {
		match[0] = str
		match.push((suffixes.length) ? suffixes[0] : '')
	}
	return match
	}

	doi.declared = function (opts) {
	opts = opts || {}
	return opts.exact ? new RegExp('^' + doiTextPrefix + doiRegex + '$') :
						new RegExp(doiTextPrefix + doiRegex, 'g')
	}

	doi.resolvePath = function (opts) {
	opts = opts || {}
	return opts.protocol ? new RegExp('^http(s)?\\://(dx\\.)?doi\\.org/' + doiRegex + '$') :
		new RegExp('^(http(s)?\\://)?(dx\\.)?doi\\.org/' + doiRegex + '$')
	}

	window.doiRegex = doi;
})();



let addCitationKey = function(result) {
	let titleIgnoreWords = ["a","in","of","the","is","out","for","to","and","from"];

	let lastAuthor = result.entryTags.author.split(" and ")[0].split(",")[0];
	//Generate CitationKey as
	//lowercase LASTAUTHOR + camelcased(first 3 non-trivial words in title/each uppercase) + year
	let cKAuthor = unidecode((lastAuthor || "").toLowerCase().replace(/\s+/g,""));

	let cKTitle = unidecode(result.entryTags.title.replace(/\W+/g,x => x == "-" ? x : " ").trim().split(" ").filter(x => !!x && titleIgnoreWords.indexOf(x.toLowerCase()) == -1).slice(0,3).map(str => str[0].toUpperCase() + str.substr(1)).join("").replace("-",""));

	let cKYear = result.entryTags.year || "";

	result.citationKey = [cKAuthor,cKTitle,cKYear].join("");
	return result;
}


let queryCrossRef = async function(query) {
	let url = "https://api.crossref.org/works" + query;;
	let response = await fetch(url);
	console.log(response);
	if (response.status != 200) return false;
	let text = await response.text();
	console.log(text);
	let result = JSON.parse(text);
	console.log(result);
	return result;
};

let addCrossRef = async function(entry) {
	let result;
	try {
		if (entry.entryTags.doi) {
			result = (await queryCrossRef( "/" + entry.entryTags.doi)).message;
		} else {
			result = (await queryCrossRef("?query.bibliographic="+encodeURIComponent(entry.entryTags.title)+"&rows=1&select=DOI,title,author,issued,container-title,is-referenced-by-count")).message.items[0];
		}
		console.log(result);

		if (!result) return;

		result.title = result.subtitle && result.subtitle.length ? _.flatten([result.title,":",result.subtitle]).join("") : result.title.join("");

		if (entry.entryTags.title) {
			let titleMatch = stringSimilarity.compareTwoStrings(result.title.toLowerCase(),entry.entryTags.title.toLowerCase());
			if (titleMatch < 0.85) {
				return console.warn("Couldn't find match for",entry.entryTags.title,"best guess",item.title)
			}
		}

		if (result.title) {
			entry.entryTags.title = result.title;
		}

		if (result.DOI) {
			entry.entryTags.doi = result.DOI;
		}

		if (result["is-referenced-by-count"]) {
			entry.entryTags.annotation = entry.entryTags.annotation ? entry.entryTags.annotation + "\n" : "";
			entry.entryTags.annotation += "Citations: " + result["is-referenced-by-count"];
		}

		if (result.author) {
			entry.entryTags.author = result.author.map(author => author.family + ", " + author.given).join(" and ");
		}

		if (result.type) {
			let typeMapper = {
				"proceedings-article":"inproceedings"
			}
			let mappedType = typeMapper[result.type];
			entry.entryType = mappedType || result.type.split("-").pop();
		}
		if (result.URL) {
			entry.entryTags.url = result.URL;
		}

		if (result.publisher) {
			entry.entryTags.publisher = result.publisher;
		}

		if (result.issued && result.issued["date-parts"]) {
			entry.entryTags.year = JSON.stringify(result.issued["date-parts"][0]).match(/(\d{4})/)[0];
		}

		if (result.abstract) {
			entry.entryTags.abstract = result.abstract.replace(/<[^>]*>/g,"");
		}

		console.log(entry);
	} catch(e) {
		console.error(e);
		return false;
	}
	return entry;
}


let enableDragDrop = function() {
	let showHideCurrent = false, showHideTarget = false;
	let showHideTimeout;

	let showHide = function(sh) {
		if (showHideTarget == sh) return;
		showHideTarget = sh;
		showHideTimeout = clearTimeout(showHideTimeout);
		showHideTimeout = setTimeout(() => {
			showHideCurrent = showHideTarget;
			if (showHideCurrent) {
				$('#drop-overlay').addClass('state-over');
			} else {
				$('#drop-overlay').removeClass('state-over');
			}
		},100);
	};

	let addItemViaDOI = async function(doi) {
		let entry = {
			entryType: "article",
			entryTags: {
				doi
			}
		};

		await addCrossRef(entry);
		addCitationKey(entry);
		addToBib([entry]);
	}

	let addToBib = function(results) {
		let newItems = [],knownItems = [];
		results.forEach(entry => {

			let foundEntry;
			foundEntry = tableData.filter(row => row.PUB.CitationKey == entry.citationKey)[0];

			if (foundEntry) {
				console.warn("Already have publication in directory",entry.citationKey,entry);
				knownItems.push(entry);
				return false;
			}

			if (entry.entryTags.title) {
				let reducedTitle = entry.entryTags.title.toLowerCase().replace(/\{|\}/g,"");

				foundEntry = tableData.filter(row => row.BIBTEX.title.toLowerCase().replace(/\{|\}/g,"") == reducedTitle)[0];
				if (foundEntry) {
					console.warn("Already have publication in directory",entry.citationKey,foundEntry);
					knownItems.push(entry);
					return false;
				}
			}
			newItems.push(entry);
		});


		let html = "<h1>BibTeX Import</h1><hr/>";
		if (newItems.length) {

			newItems.forEach(newItem => {
				onBibUpdate(newItem,true);
			});

			html += "<br/>The following data was added<br/><pre><code>" + bibtexParse.toBibtex(newItems,false) + "</pre></code>";
		}

		if (knownItems.length) {
			html += "<br/>The following publications are already in the directory<br/><pre><code>" + bibtexParse.toBibtex(knownItems,false) + "</pre></code>";
		}

		window.enableUIKitUpdates();
		UIkit.modal.alert(html);
		setTimeout(() => {
			window.disableUIKitUpdates();
		},100);

	};


	$(document.body).on({
		dragover: function(e) {
			showHide(true);
			e.preventDefault();
			e.originalEvent.dataTransfer.dropEffect = 'copy';
		},
		dragleave: function(e) {
			showHide(false);
			e.preventDefault();
		},
		drop: async function(e) {
			$('#drop-overlay').removeClass('state-over');
			$('#drop-processing').addClass('state-over');

			e.preventDefault();

			isDraggingOver = false;
			let dt = e.originalEvent.dataTransfer;


			let droppedHandled = false;

			try {
				var data = dt.items;
				let doiQueue = {};

				let typeHandlers = {
					"plaintext": async (str) => {
						console.info("Text was dropped",str);
						let doi = doiRegex().exec(str)[0];
						doiQueue[doi] = true;
					},
					"uri": async (str) => {
						console.info("URI was dropped",str);

						try {
							let doi = doiRegex().exec(str)[0];
							doiQueue[doi] = true;
							console.log("FOUND DOI",doi);
							return;
						} catch(e) {

						}

						try {
							let doi = doiRegex().exec(decodeURIComponent(str))[0];
							doiQueue[doi] = true;
							console.log("FOUND DOI",doi);
						} catch(e) {

						}
					},
					"html": async (str) => {

						let results = [];
						str = decodeURIComponent(str);

						let entries = str.split("csl-entry").slice(1);
						for(let entry of entries) {
							try {
								entry = entry.split("<span")[1].split('"></span>')[0];
								let result = {};

								let mapper = {"rft.title":"title","rft.identifier":"link","rft.description":"abstract","rft.aulast":"lastAuthor","rft.au":"author","rft.date":"date","rft.pages":"pages","rft.issn":"issn","rft.atitle":"title","rft.genre":"genre"};

								entry.split("&amp;").filter(entry => entry.indexOf("rft") == 0).forEach(fieldValue => {
									let [field,...value] = fieldValue.split("=");
									value = value.join("=");
									let mapped = mapper[field];
									//console.debug(field,value);
									if (!mapped) return;
									if (mapped === true) {
										result[field] = value
									} else {
										result[mapped] = (result[mapped] ? result[mapped] + ", " : "") + value;
									}
								});
								if (result.date) {
									result.year = result.date.match(/\d{4}/)[0];
								}
								if (!result.title) {
									throw(new Error("Unknown title"));
									return;
								}

								if (result.author) {
									let authors = result.author.split(", ").map(author => {
										let names = author.split(" ");
										lastName = names.pop();
										firstNames = names;
										return lastName + ", " + firstNames.join(" ")
									}).join(" and ");
									result.author = authors;
								}

								result = {
									entryType: result.type || "article",
									entryTags: result
								};

								await addCrossRef(result);
								if (!result.citationKey) {
									addCitationKey(result);
								}
								delete result.entryTags.lastAuthor;
								//delete result.entryTags.citationKey;
								results.push(result);

							} catch(e) {
								console.log("Unknown format",e);
							}
						}


						if (results.length > 0) {
							addToBib(results);
							droppedHandled = true;
						}
					},
					"file": (bibtexData) => {
						let results = {};
						try {
							bibtexParse.toJSON(bibtexData).reduce((acc, cur) => {
								acc[cur.citationKey] = cur;
								return acc;
							}, results);

							let toImport = {};
							Object.entries(results).forEach(([citationKey,entry]) => {

								toImport[citationKey] = entry;
							});

							addToBib(Object.values(toImport));
							droppedHandled = true;
						} catch(e) {
							let errMsg = "Unable to parse dropped file, please make sure it is in bibtex format";
							UIkit.modal.alert(errMsg)
							return;
						}
					}
				}

				let dataItems = [];
				for(let item of data) {
					dataItems.push(item);
				}
				let handlers = dataItems.map(item => {
					console.log(item.kind);
					if ((item.kind == 'string') && (item.type.match('^text/plain'))) {
						return new Promise((resolve,reject) => {
							item.getAsString(async (str) => {
								await typeHandlers.plaintext(str);
								resolve();
							});
						});
					} else if ((item.kind == 'string') && (item.type.match('^text/html'))) {
						return new Promise((resolve,reject) => {
							item.getAsString(async str => {
								await typeHandlers.html(str);
								resolve();
							});
						});
					} else if ((item.kind == 'string') && (item.type.match('^text/uri-list'))) {
						// Drag data item is URI
						return new Promise((resolve,reject) => {
							item.getAsString(async str => {
								await typeHandlers.uri(str);
								resolve();
							});
						});
					} else if ((item.kind == 'file')) {
						return new Promise((resolve,reject) => {
							var f = item.getAsFile();
							let reader = new FileReader();

							reader.readAsText(f);
							reader.onload = async function() {
								await typeHandlers.file(reader.result);
								resolve();
							};

							reader.onerror = function() {
								console.log(reader.error);
							};
						});
					}
				});

				await Promise.all(handlers);
				console.log(handlers);

				console.log(doiQueue);
				for(let doi of Object.keys(doiQueue)) {
					let res = await addItemViaDOI(doi);
					droppedHandled = true;
				}
			} catch(e) {

			}

			$('#drop-processing').removeClass('state-over');

			if (!droppedHandled) {
				UIkit.modal.alert("Sorry, we were unable to import what you dropped. We support DOIs, .BIB files and Zotero items.")
			 }
		}

	});
};