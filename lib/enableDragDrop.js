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
		drop: function(e) {
			$('#drop-overlay').removeClass('state-over');

			e.preventDefault();

			isDraggingOver = false;
			let dt = e.originalEvent.dataTransfer;


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

				UIkit.modal.alert(html);
			};

			var data = dt.items;
			for (var i = 0; i < data.length; i += 1) {
				let item = data[i];
			  if ((item.kind == 'string') &&
				  (item.type.match('^text/plain'))) {
				// This item is the target node
				item.getAsString((str) => {
					console.info("Text was dropped",str);
				});
			  } else if ((item.kind == 'string') && (item.type.match('^text/html'))) {
				// Drag data item is HTML
				item.getAsString(str => {
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

							if (!result.citationKey) {
								let titleIgnoreWords = ["a","in","of","the","is","out","for","to","and","from"];

								//Generate CitationKey as
								//lowercase LASTAUTHOR + camelcased(first 3 non-trivial words in title/each uppercase) + year
								let cKAuthor = unidecode(result.lastAuthor.toLowerCase().replace(/\s+/g,""));

								let cKTitle = unidecode(result.title.replace(/\W+/g,x => x == "-" ? x : " ").trim().split(" ").filter(x => !!x && titleIgnoreWords.indexOf(x) == -1).slice(0,3).map(str => str[0].toUpperCase() + str.substr(1)).join("").replace("-",""));

								let cKYear = result.year;

								result.citationKey = [cKAuthor,cKTitle,cKYear].join("");
								delete result.lastAuthor;
							}

							result = {
								entryType: result.type || "article",
								citationKey: result.citationKey,
								entryTags: result
							};

							delete result.entryTags.citationKey;
							results.push(result);

						} catch(e) {
							console.log("Unknown format",e);
						}
					}



					addToBib(results)

				});

			} else if ((item.kind == 'string') && (item.type.match('^text/uri-list'))) {
				// Drag data item is URI
				item.getAsString(str => {
					console.info("URI was dropped",str);
				});

			  } else if ((item.kind == 'file')) {
				var f = item.getAsFile();
				let reader = new FileReader();

				reader.readAsText(f);
				reader.onload = function() {
					let bibtexData = reader.result;
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
					} catch(e) {
						let errMsg = "Unable to parse dropped file, please make sure it is in bibtex format";
						UIkit.modal.alert(errMsg)
						return;
					}
				};

				reader.onerror = function() {
					console.log(reader.error);
				};

			  }
		   }
		}
	});
};