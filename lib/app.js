let config = {
	bibtexFile: "/db/bibtex/bibtex.bib",
	csvFile: "/db/csv/ambientdirectory.csv"
}



function toCamelCase(str) {
	return str.replace(/\w\S*/g, function (txt) {
		return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
	});

}

$.fn.dataTable.Debounce = function (table, delayMs) {
	var tableId = table.settings()[0].sTableId;
	$('.dataTables_filter input[aria-controls="' + tableId + '"]') // select the correct input field
		.unbind() // Unbind previous default bindings
		.bind('input', (delay(function (e) { // Bind our desired behavior
			table.search($(this).val()).draw();
			return;
		}, delayMs))); // Set delay in milliseconds
}

function delay(callback, ms) {
	var timer = 0;
	return function () {
		var context = this,
			args = arguments;
		clearTimeout(timer);
		timer = setTimeout(function () {
			callback.apply(context, args);
		}, ms || 0);
	};
}

let originalData, tableData;

let valueTransformer = {
	"OUTPUT.MEDIUM": {
		"OBJECT.ARTIFICIAL": "ARTIFICIAL_OBJECT",
		"OBJECT.UNRELATED": "KNOWN_OBJECT",
		"OBJECT.ALREADY_ASSOCIATED": "ASSOCIATED_OBJECT",
	},
	"META.SETTING": {
		"FAMILY": "HOME",
		"PARTNERSHIP": "HOME"
	}
};

let originalDataDbId = {},
	tableDataDbId = {};
let table;

let showAbstract = function (dbId) {
	let entry = originalDataDbId[dbId];
	let html = "<h1 class='.uk-heading-medium'>" + entry.BIBTEX.title + "</h1><h3 class='.uk-heading-small'>" + entry.BIBTEX.author + "</h3><hr/><br/>" + entry.BIBTEX.abstract;
	UIkit.modal.confirm(html).dialog;
	return false;
};

let dbUpdates;

let updateChangeButtons = () => {
	let numEdits = Object.keys(dbUpdates).length;
	if (numEdits > 0) {
		numEdits = " (" + numEdits + ")";
	} else {
		numEdits = "";
	}

	$('.numChanges').toArray().forEach(button => {
		button = $(button);
		button.text(button.text().replace(/\(\d+\)/, "") + numEdits)
	});
};

let saveDBUpdates = () => {
	window.localStorage.setItem("databaseupdates", JSON.stringify(dbUpdates));
	updateChangeButtons();
};

let readDBUpdates = () => {
	if (!dbUpdates) {
		try {
			let ls = window.localStorage.getItem("databaseupdates") || "{}";
			dbUpdates = JSON.parse(ls);
		} catch (e) {
			console.warn("Database corrupted. Clearing all local changes", e);
			dbUpdates = {};
			window.localStorage.setItem("databaseupdates", "{}");
		}
	}
	Object.entries(dbUpdates).forEach(([dbId, fields]) => {
		if (!Object.keys(fields).length) {
			delete dbUpdates[dbId];
		}
	})

	updateChangeButtons();
};

let createGitHubMarkdown = () => {
	readDBUpdates();
	if (!dbUpdates) {
		return console.error("No local changes to publish.");
	}


	let mdTable = "\n\n| dbId | REVISION | CitationKey | Field | Old | New |\n\n|:-----|:-----|:-----| :--- | :--- | :----|\n\n";

	let exportedUpdates = {};
	Object.entries(dbUpdates).forEach(([dbId, fields]) => {
		Object.entries(fields).forEach(([field, {
			REVISION,
			CitationKey,
			newValue,
			oldValue,
			published
		}]) => {
			if (published) return;
			exportedUpdates[dbId] = exportedUpdates[dbId] || {};
			exportedUpdates[dbId][field] = {
				REVISION,
				CitationKey,
				newValue,
				oldValue,
				published
			};
			mdTable += "|" + [dbId, REVISION, CitationKey, field, oldValue, newValue].join("|") + "|\n\n";
			//console.log(dbId,CitationKey,field,oldValue,newValue);
		})
	});

	return exportedUpdates;
};

let createGitHubHTML = () => {
	readDBUpdates();
	if (!dbUpdates) {
		return console.error("No local changes to publish.");
	}


	let mdTable = "<table class='localChangesTable'><thead><tr><th>Name</th><th>CitationKey</th><th>Field</th><th>Old</th><th>New</th><th>dbId</th><th>Revision</th></tr></thead><tbody>";


	Object.entries(dbUpdates).forEach(([dbId, fields]) => {
		let entry = tableDataDbId[dbId];
		let revision = entry.DB.REVISION;
		let name = entry.META.Name;
		Object.entries(fields).forEach(([field, {
			CitationKey,
			newValue,
			oldValue,
			published
		}]) => {
			if (published) return;
			mdTable += "<tr><td>" + [name, CitationKey, field, oldValue, newValue, dbId, revision].join("</td><td>") + "</td></tr>";
		})
	});

	return mdTable + "</tbody></table>";
};


let sendGitHubIssue = async () => {
	let contentHTML = createGitHubHTML();
	//let contentMD = createGitHubMarkdown();
	let url = 'https://maker.ifttt.com/trigger/ad_data_update/with/key/bn-WYmNimn3ATbOUs-i8BJkaWvDgC_LrcDd8fkv5h8I';


	//contentMD = "A\nB\\nC\rD\\rE\r\nF\\r\\nG";

	UIkit.modal($('#modal-container')[0]).hide();



	return new Promise((resolve, reject) => {
		let err = (a, b, c) => {
			UIkit.modal.alert('There was an error in publishing your changes. Your local changes are not affected. The console might help in identifying the cause. Please open an issue on GitHub. You can always save your current state by downloading the list via "Save CSV".')

			console.error(a, b, c);
			reject();
		}
		$.ajax({
			url,
			type: "POST",
			data: {
				value1: contentHTML
			},
			complete: () => {
				Object.entries(dbUpdates).forEach(([dbId, fields]) => {
					Object.entries(fields).forEach(([field, {
						CitationKey,
						newValue,
						oldValue
					}]) => {
						fields[field].published = true;
					});
				});
				saveDBUpdates();
				UIkit.modal.alert('A GitHub issue to implement your changes has been created. You can it at <a href="https://github.com/carstenschwede/ambient.directory/issues" target="_blank">https://github.com/carstenschwede/ambient.directory/issues</a>. Thanks for your contribution!')

				resolve();
			},
			failure: err,
			error: err
		});
	});
};

let retrieveBibtex = function (url) {
	return new Promise(async (resolve, reject) => {
		let bibtex = await (await fetch(url)).text();
		resolve(bibtexParse.toJSON(bibtex).reduce((acc, cur) => {
			acc[cur.citationKey] = cur.entryTags;
			return acc;
		}, {}));
	});
};



(async () => {
	let bibtex = await retrieveBibtex(config.bibtexFile);
	let transformed = await loadCSV(config.csvFile, window.Papa);

	//Remove empty entries
	transformed = transformed.map(row => {
		if (!row.PUB.CitationKey) {
			console.warn(row, "has no CitationKey, removed");
		};
		return row;
	}).filter(row => row.PUB.CitationKey);

	//Generate random ids if not set already.
	transformed.filter(row => !row.DB.ID).forEach(row => {
		row.DB.ID = Math.random().toString(36).replace("0.", "");;
	});

	transformed.filter(row => !row.DB.REVISION).forEach(row => {
		row.DB.REVISION = 1;
	});

	transformed.forEach(row => {
		row.DB.REVISION = 1;
	});

	console.log(transformed.length, "entries imported from CSV");
	console.log(Object.keys(bibtex).length, "entries imported from BibTex");

	transformed = transformed.filter(row => {
		let citationKey = row.PUB.CitationKey;
		if (!citationKey) {
			return console.error("No CitationKey in CSV row", row);
		}
		row.BIBTEX = bibtex[citationKey];
		if (!row.BIBTEX) {
			//console.log(citationKey,"was not found in bibtex",bibtex);
			let oldKey = citationKey.replace("_nodate", "");
			oldKey = oldKey.replace(/_/g, "");
			oldKey = oldKey.replace(/\+/g, "");
			oldKey = oldKey.replace(/-/g, "");

			oldKey = oldKey.replace(/\d+\w*/, "");
			oldKey = oldKey.toLowerCase();

			let keysWhichStartSimilarly = Object.keys(bibtex).filter(key => {
				return key.toLowerCase().indexOf(oldKey) == 0;
			});

			//Make keysWhichStartSimilarly unique
			keysWhichStartSimilarly = [...new Set(keysWhichStartSimilarly)];


			if (keysWhichStartSimilarly.length) {
				//console.log("Found similary keys",keysWhichStartSimilarly);
				if (keysWhichStartSimilarly.length == 1) {
					let newKey = keysWhichStartSimilarly[0];
					row.PUB.CitationKey = newKey;
					row.BIBTEX = bibtex[newKey];
				} else {
					console.warn("More than one similar key found", citationKey, "is not imported", keysWhichStartSimilarly);
					return false;
				}
			} else {
				console.warn(citationKey, "was not found in bibtex", bibtex);
				return false;
			}
		}
		row.BIBTEX.author = row.BIBTEX.author || "";
		row.BIBTEX.title = row.BIBTEX.title || "";
		row.BIBTEX.doi = row.BIBTEX.doi || "";
		row.BIBTEX.url = row.BIBTEX.url || "";

		row.META.Description = row.META.Description || ""; //row.BIBTEX.abstract || "";
		if (row.META.Description == row.BIBTEX.abstract) {
			row.META.Description = "";
		}
		return row.BIBTEX;
	});




	//Calculate Citations per Year
	let currentYear = new Date().getUTCFullYear();
	transformed.forEach(row => {
		//if (row.META.Name == "Persuasive Mirror") debugger;
		row.BIBTEX.year = parseInt(row.BIBTEX.year);
		row.PUB.CitationsPerYear = 0;

		let csvCites = parseInt(row.PUB.Citations);
		let bibTexCites;
		let extra = row.BIBTEX.annotation;


		if (extra && extra.indexOf("Citations:") > -1) {
			try {
				bibTexCites = parseInt(extra.match(/Citations\:\s*(\d+)/)[1]);
			} catch (e) {}
		}

		if (extra && extra.indexOf("ZSCC:") > -1) {
			try {
				bibTexCites = parseInt(extra.match(/ZSCC\:\s*(\d+)/)[1]);
			} catch (e) {}
		}

		let cites = Math.max(0, Math.max.apply(false, [csvCites, bibTexCites].filter(x => x && !Number.isNaN(x))));
		if (!cites || Number.isNaN(cites)) return;

		row.PUB.Citations = cites;

		if (!row.BIBTEX.year) return;

		let age = currentYear - row.BIBTEX.year + 0.5;
		row.PUB.CitationsPerYear = Math.round(row.PUB.Citations / age * 10) / 10;
	});

	transformed.forEach(row => {
		row.META.Name = row.META.Name.replace("?CHECK!", "?");
		row.BIBTEX.title = row.BIBTEX.title.replace(/{|}/g, "");
		row.BIBTEX.author = row.BIBTEX.author.replace(/{|}/g, "");
		row.BIBTEX.abstract = row.BIBTEX.abstract || "";

		row.PUB.Title = row.BIBTEX.title;
		row.PUB.Author = row.BIBTEX.author;
		row.PUB.Year = row.BIBTEX.year || row.PUB.Year;
	});


	//Transform "LastName#1, FirstName#1 and LastName#2, FirstName#2" to
	// "- FirstName#1 LastName#1",
	// "- FirstName#2 LastName#2"

	window.transformed = transformed;
	let columns = Object.entries(tableFields).map(([field, properties]) => {
		let result = {};
		result.data = field;
		result.title = properties.title;
		result.visible = properties.hide ? false : true;
		result.render = (properties.render && properties.render.transform) || false;
		result.editable = properties.editable;
		result.searchable = properties.searchable !== undefined ? properties.searchable : false;
		return result;
	}).filter(x => !!x);



	columns.forEach(col => {
		if (col.title === undefined) {
			let title = col.data && col.data.toUpperCase().split(".").slice(-1)[0];
			col.title = title;
		}
	});


	//Replace Historic Value with New ones
	transformed.forEach(row => {
		Object.entries(valueTransformer).forEach(([field, mappings]) => {
			let [mainField, subField] = field.split(".");
			if (!row[mainField][subField]) return;
			Object.entries(mappings).forEach(([s, r]) => {
				if (row[mainField][subField] == s) {
					row[mainField][subField] = r;
				}
			});
		});
	})



	originalData = transformed;
	tableData = JSON.parse(JSON.stringify(transformed));

	transformed = false;

	originalData.forEach(row => {
		originalDataDbId[row.DB.ID] = row;
	});

	tableData.forEach(row => {
		tableDataDbId[row.DB.ID] = row;
	});

	readDBUpdates();
	let haveLocalChangesBeenDiscarded = false;
	Object.entries(dbUpdates).forEach(([dbId, fields]) => {
		let tableEntry = tableDataDbId[dbId];
		let originalEntry = originalDataDbId[dbId];
		if (!tableEntry) {
			console.warn(dbId, "not found, changes will be discarded");
			delete dbUpdates[dbId];
			haveLocalChangesBeenDiscarded = true;
			return;
		}

		Object.entries(fields).forEach(([field, {
			REVISION,
			CitationKey,
			newValue,
			oldValue
		}]) => {
			let [mainField, subField] = field.split(".");
			if (originalEntry[mainField][subField] == newValue) {
				delete fields[field];
				if (!Object.keys(fields).length) {
					delete dbUpdates[dbId];
				}
				haveLocalChangesBeenDiscarded = true;
				return;
			}

			if (originalEntry.DB.REVISION > REVISION) {
				//REMOTE VERSION IS NEWER THAN LOCAL, DISCARDING LOCAL CHANGES
				haveLocalChangesBeenDiscarded = true;
				delete fields[field];
				console.warn("Local changes", field, REVISION, CitationKey, newValue, oldValue, "were discard due to remote state being newer");
			} else {
				tableEntry[mainField][subField] = newValue;
			}

		});
	});

	if (haveLocalChangesBeenDiscarded) {
		UIkit.modal.alert('Some of your local changes have been overwritten by remote updates. This might indicate that your change request has been approved or that somebody else has updated similar records as you did.')
		saveDBUpdates();
		updateChangeButtons();
	}

	let renderChoiceFields = function (data, filter, obj, meta) {
		if (data && data == "?") data = "";
		let colOptions = columns[meta.col];

		if (!colOptions || !colOptions.editable) return "";

		let choices = JSON.parse(JSON.stringify(colOptions.editable));
		delete choices.$multiple;
		let multiple = colOptions.editable.$multiple;

		if (Array.isArray(choices)) {
			choices = choices.reduce((acc, cur) => {
				acc[cur] = toCamelCase(cur.toLowerCase().replace(/_/g, " "));
				return acc;
			}, {});
		}


		let fieldIdx = meta.col + "_" + meta.row;

		let match = false;

		if (multiple) {
			options = Object.entries(choices).map(([choice, choiceLabel]) => {
				let checked = data && data.toLowerCase().indexOf(choice.toLowerCase()) > -1 ? "checked='checked'" : "";
				match = match || checked;

				return '<span style="white-space:nowrap"><input class="uk-checkbox" type="checkbox" id="' + choice + '" name="' + fieldIdx + '" value="' + choice + '"' + checked + ' >&nbsp;<label for="' + choice + '">' + choiceLabel + '</label></span>';
			}).join("\n");

			if (data && !match) {
				console.log(obj.DB.ID, "has ", colOptions.data, " value of", data, "but should be one of", Object.keys(choices));
			}
			return "<fieldset class='uk-fieldset'>" + options + "</fieldset>";

		} else {
			let options = Object.entries(choices).map(([choice, choiceLabel]) => {
				let checked = data && data.toLowerCase().indexOf(choice.toLowerCase()) > -1 ? "selected" : "";
				match = match || checked;

				if (!data && choice.toLowerCase() == "?") {
					checked = "selected";
				}
				return '<option value="' + choice + '" ' + checked + '>' + choiceLabel + '</option>';
			}).join("\n");

			if (data && !match) {
				console.log(obj.PUB.CitationKey, "has ", colOptions.data, " value of", data, "but should be one of", Object.keys(choices));
			}
			return "<select class='uk-select' name='" + fieldIdx + "'>" + options + "</select>";

		}
	};

	columns.forEach(col => {
		if (!col.editable) return;
		if (col.editable === true) return;
		if (col.editable == "*") return; //text entry, will be handled via content-editable;
		col.render = renderChoiceFields;
	})

	$(document).ready(function () {
		let onFieldUpdate = (id, field, value) => {
			if (value == "?") {
				value = "";
			}

			let tableEntry = tableDataDbId[id];
			let originalEntry = originalDataDbId[id];

			if (!tableEntry) {
				return console.error("Unknown entry", id);
			}

			let [mainField, subField] = field.split(".");

			let originalValue = originalEntry[mainField][subField];

			readDBUpdates();
			dbUpdates[id] = dbUpdates[id] || {};

			if (originalValue == value) {
				delete dbUpdates[id][field];
				tableEntry[mainField][subField] = originalValue;
			} else {
				dbUpdates[id][field] = {
					CitationKey: tableEntry.PUB.CitationKey,
					REVISION: tableEntry.DB.REVISION,
					oldValue: originalValue,
					newValue: value
				};
				console.info("Added", id, field, value, "to database of local changes");
				tableEntry[mainField][subField] = value;
			}

			saveDBUpdates();
		};


		//exportCSV();


		let columnsById = columns.reduce((acc, cur) => {
			acc[cur.data] = cur;
			return acc;
		}, {})

		let getDbIdFromRow = (node) => {
			//FIND PARENT TR
			let parent = node;
			while (parent = parent.parentNode) {
				if (parent.tagName == "TR") break;
			}

			if (!parent || parent.tagName != "TR") {
				return;
			}

			let id = $('span.dbId', parent).attr("id");
			return id;
		};

		let aoColumnDefs = columns.map((col, i) => {
			return {
				sClass: col.data.replace(".", "-"),
				aTargets: [i]
			}
		});


		let buttons = ["excel", "pdf", {
			text: 'Save CSV',
			action: function () {
				let result = exportCSV(Object.values(tableData), window.Papa);
				$.fn.dataTable.fileSave(
					new Blob([result]),
					'ambientdirectory.csv'
				);
			}
		}, {
			text: "Publish Changes",
			className: 'numChanges',
			action: () => {
				readDBUpdates();

				let atLeastOneUpdate = false;
				Object.entries(dbUpdates).forEach(([dbId, fields]) => {
					Object.entries(fields).forEach(([field, {
						REVISION,
						CitationKey,
						newValue,
						oldValue,
						published
					}]) => {
						if (!published) atLeastOneUpdate = true;
					});
				});



				if (!atLeastOneUpdate) {
					return UIkit.modal.alert('You haven\'t made any new changes that would need publishing. You can continue editing most data fields simply by clicking in them.');
				}
				let contentHTML = createGitHubHTML();
				$('#githubIssueText').html(contentHTML);
				UIkit.modal($('#modal-container')[0]).show();
				//sendGitHubIssue();
			}
		}, {
			text: "Clear Changes",
			className: 'numChanges',
			action: () => {
				window.localStorage.setItem("databaseupdates", "{}");
				dbUpdates = {};
				readDBUpdates();
				UIkit.modal.alert('Local changes have been cleared. In order to revert displayed cells to their original state, please reload the page.')
			}
		}, {
			text: "Toggle Meta",
			action: (() => {
				let visible = false;
				return function (e, dt) {
					visible = !visible;
					for (let col = 10; col < 10 + 6; col++) {
						dt.column(col).visible(visible);
					}
				}
			})()
		}, {
			text: "Toggle Mapping",
			action: (() => {
				let visible = false;
				return function (e, dt) {
					visible = !visible;
					for (let col = 10 + 6; col < 10 + 6 + 8; col++) {
						dt.column(col).visible(visible);
					}
				}
			})()
		}, {
			text: "Toggle Output",
			action: (() => {
				let visible = false;
				return function (e, dt) {
					visible = !visible;
					for (let col = 10 + 6 + 8; col < 10 + 6 + 10 + 7; col++) {
						dt.column(col).visible(visible);
					}
				}
			})()
		}, {
			text: "Toggle Evaluation",
			action: (() => {
				let visible = false;
				return function (e, dt) {
					visible = !visible;
					for (let col = 31; col < 39; col++) {
						dt.column(col).visible(visible);
					}
				}
			})()
		}];
		buttons.forEach(button => {
			button.className = (button.className || "") + ' uk-button uk-button-default';
		});

		$('#example').click((clickEvt) => {
			let tag = clickEvt.target.tagName;

			let affectedRowsIdx = [];

			let newNode = clickEvt.target;
			let field;

			let parent = newNode;
			while (!field && parent) {
				field = (parent.className || "").split(" ").map(fieldName => {
					return fieldName.trim().replace("-", ".");
				}).filter(fieldName => columnsById[fieldName] && columnsById[fieldName].editable)[0];
				parent = parent.parentNode;
			}
			if (!field) return console.error("NO FIELD FOUND");

			let [mainField, subField] = field.split(".");

			let id = getDbIdFromRow(newNode);
			if (!id) return console.error("Unable to get ID from", parent);


			let getSearchResultTableRows = function (field) {
				let affectedRowsIdx = table.rows({
					"search": "applied"
				})[0];

				let rows = [];
				if (affectedRowsIdx.length) {
					affectedRowsIdx.forEach(idx => {
						let row = tableData[idx];
						let dbId = row.DB.ID;

						let result = {
							row
						};
						let trRow = $('#' + dbId).parent().parent()[0];
						if (trRow) {
							result.td = $('td.' + field.replace(".", "-"), trRow);
						}
						rows.push(result);
					});
				}
				return rows;
			}



			switch (tag) {
				case "INPUT":
					$(newNode).one("input", (fieldEvt) => {
						let fieldValue = $(fieldEvt.target).val();
						let onOff = !!$(fieldEvt.target).is(':checked');
						let combinedValues = $('input:checked', newNode.parentNode.parentNode).toArray().map(k => $(k).val()).join(",");
						onFieldUpdate(id, field, combinedValues);


						//Handle multiple updates (SHIFT PRESSED)
						let shift = clickEvt.shiftKey;
						let otherRows = shift ? getSearchResultTableRows(field) : [];

						if (otherRows.length) {
							let updatedCounter = 0;
							otherRows.forEach(row => {
								if (row.td) {
									let input = $('input[value="' + fieldValue + '"]', row.td)[0];
									if (input) {
										$(input).prop("checked", onOff);
									} else {
										console.warn("Unable to locate input element for", row.td);
									}
								}

								let oldValue = row.row[mainField][subField];
								let oldValues = oldValue ? oldValue.split(",") : [];
								let newValues;

								if (onOff) {
									oldValues.push(fieldValue);
									newValues = _.uniq(oldValues);
								} else {
									newValues = oldValues.filter(elem => elem != fieldValue);
								}

								onFieldUpdate(row.row.DB.ID, field, newValues.join(","));
								updatedCounter++;
							});
							if (updatedCounter) {
								UIkit.modal.alert(updatedCounter + ' entries have been updated.')
							} else {
								UIkit.modal.alert('No entries were updated.');
							}
						}
					});
					break;

				case "SELECT":
					$(newNode).one("input", (fieldEvt) => {
						let value = $(newNode).val().trim();
						onFieldUpdate(id, field, value);

						//Handle multiple updates (SHIFT PRESSED)
						let shift = clickEvt.shiftKey;
						let otherRows = shift ? getSearchResultTableRows(field) : [];

						if (otherRows.length) {
							let updatedCounter = 0;
							otherRows.forEach(row => {
								if (row.td) {
									let select = $('select', row.td);
									if (select) {
										select.val(value);
									} else {
										console.warn("Unable to locate select element for", td);
									}
								}
								onFieldUpdate(row.row.DB.ID, field, value);
								updatedCounter++;
							});
							if (updatedCounter) {
								UIkit.modal.alert(updatedCounter + ' entries have been updated.')
							} else {
								UIkit.modal.alert('No entries were updated.');
							}
						}
					});

					break;
				case "TD":
					let shift = clickEvt.shiftKey;

					if (shift) {
						UIkit.modal.alert('Multi-entry only supported for select fields but not for text fields.');
						return;
					}
					$(newNode).attr('contenteditable', true);
					$(clickEvt.target).focus();

					if (newNode.registered) return;
					newNode.registered = true;
					$(newNode).on("input", () => {
						let value = $(newNode).text().trim();
						onFieldUpdate(id, field, value);
					});
					break;
			}



		});

		table = $('#example').DataTable({
			data: tableData,
			aoColumnDefs,
			dom: 'QlBfrtip',

			columns,
			deferRender: true,
			/*
			"createdRow": function( row, data, dataIndex ) {
				console.log("row creation");
			 },
			 */

			"processing": true,
			//"order": [[1, 'asc']],
			keys: false,
			language: {
				searchBuilder: {
					add: '+',
					condition: 'Comparator',
					clearAll: 'Reset',
					deleteTitle: 'Delete',
					data: 'Column',
					leftTitle: 'Left',
					logicAnd: 'And',
					logicOr: 'Or',
					rightTitle: 'Right',
					title: {
						0: 'Filters',
						_: 'Filters (%d)'
					},
					value: 'Option',
				}
			},
			scrollX: true,
			scrollY: 800,
			scroller: true,
			autoWidth: false,
			fixedColumns: {
				leftColumns: 3
			},
			mark: true,
			buttons
		});

		var debounce = new $.fn.dataTable.Debounce(table, 350);
		$('#loadingIndicator').fadeOut()
		updateChangeButtons();
		//console.log("ready");





	});
})();


//Map browser search to within-site search
function KeyPress(e) {
	var evtobj = window.event ? window.event : e;
	let isSearchShortcut = (evtobj.keyCode == 70 && evtobj.metaKey);
	if (isSearchShortcut) {
		$('input[type=search]').focus().select();
		return false;
	}
}

document.onkeydown = KeyPress;