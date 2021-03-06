let config = {
	bibtexFile: "db/bibtex/ambientdirectory.bib",
	csvFile: "db/csv/ambientdirectory.csv"
}

let dbUpdates,originalData, tableData, originalDataDbId = {},tableDataDbId = {},table, columns, columnsById;let activeFilterFunctions = {}, aoColumnDefs;

let getEmptyCSVEntry = function() {
	let entry = {};
	csvHeaders.forEach(header => {
		let [mainField,subField] = header.split(".");
		entry[mainField] = entry[mainField] || {};
		entry[mainField][subField] = "";
	});
	return entry;
};

let generateDbId = function() {
	let unique = false,dbid;
	while(!unique) {
		dbid = Math.random().toString(36).replace("0.", "");
		unique = !tableDataDbId[dbid];
	}
	return dbid;
}

let showAbstract = function (dbId) {
	let entry = originalDataDbId[dbId];
	let html = "<h1 class='.uk-heading-medium'>" + entry.BIBTEX.title + "</h1><h3 class='.uk-heading-small'>" + entry.BIBTEX.author + "</h3><hr/><br/>" + entry.BIBTEX.abstract;
	UIkit.modal.confirm(html).dialog;

	return false;
};


let currentMarkInstances;
let updateTextHighlights = function() {
	if (currentMarkInstances) {
		currentMarkInstances.forEach(m => m.unmark());
	}
	currentMarkInstances = [];

	let searchPatterns = $('input.autofilter,input[type=search]').map((i,k) => $(k).val()).filter((i,x) => x).toArray().map(parseSearchPattern);

	let regExps = searchPatterns.filter(pat => pat.isRegExp).map(pat => new RegExp(pat.regExpStr,pat.modifiers));
	let normalStrings = searchPatterns.filter(pat => !pat.isRegExp).map(pat => pat.pattern);

	let colSelector = columns.map((colDesc,idx) => {
		let textSearch = colDesc.filter === "*" || colDesc.searchable;
		if (textSearch) return "td." + colDesc.data.replace(".","-");
	}).filter(x => !!x);

	colSelector.push('#abstract-container');

	colSelector = colSelector.join(",");
	console.log(normalStrings,regExps,searchPatterns);

	currentMarkInstances.push($(colSelector).mark(normalStrings))

	regExps.forEach(regExp => {
		currentMarkInstances.push($(colSelector).markRegExp(regExp));
	});
}



/******************************************/
//Importers will be called for each CSV and BibTeX entry
/******************************************/

let Importers = {
	CSV: function(row) {
		//Generate random ids if not set already.
		row.DB.ID = row.DB.ID || generateDbId();
		row.DB.REVISION = row.DB.REVISION || 1;
		mergeCSVRowWithBibtex(row);
		if (!row.BIBTEX) {
			console.error("No BibTex entry found");
			return;
		}

		//Map old style values to new ones

		/*
let valueTransformer = {
	"OUTPUT.SIMILARITY": {
		"KNOWN":"FAMILIAR"
	}
};
let applyValueTransform = function(row) {
	row.OUTPUT.TECH = row.OUTPUT.TECH || "";
	row.OUTPUT.SIMILARITY = row.OUTPUT.SIMILARITY || "";
	let blub = ["ART","ASSOCIATED_OBJECT","KNOWN_OBJECT","ARTIFICIAL_OBJECT"];
	(row.OUTPUT.MEDIUM || "").split(",").forEach(k => {
		if (!k) return;

		let values;
		if (!blub.includes(k)) {
			values = row.OUTPUT.TECH.split(",").filter(x => !!x);values.push(k);
			row.OUTPUT.TECH = _.uniq(values).join(",")
		} else {
			values = row.OUTPUT.SIMILARITY.split(",").filter(x => !!x);values.push(k);
			row.OUTPUT.SIMILARITY = _.uniq(values).join(",")
		}
	});
	delete row.OUTPUT.MEDIUM;


	Object.entries(valueTransformer).forEach(([field, mappings]) => {
		let [mainField, subField] = field.split(".");

		if (!row[mainField][subField]) return;
		Object.entries(mappings).forEach(([s, r]) => {

			row[mainField][subField] = row[mainField][subField].split(",").map(str => {
				if (str === s) return r;
				return str;
			}).filter(x => !!x).join(",");
		});
	});
}
applyValueTransform(row);
*/

		//row.EVAL.HAS_EVALUATION = "";

		/***************************************** */
		//Calculate Citations per Year
		/***************************************** */
		let currentYear = new Date().getUTCFullYear();

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
		if (cites && !Number.isNaN(cites)) {
			row.PUB.Citations = cites;

			if (row.BIBTEX.year) {
				let age = currentYear - row.BIBTEX.year + 0.5;
				row.PUB.CitationsPerYear = Math.round(row.PUB.Citations / age * 10) / 10;
			}
		}
		/*********************************************** */

		row.META.Name = row.META.Name.replace("?CHECK!", "?");
		row.BIBTEX.title = row.BIBTEX.title.replace(/{|}/g, "");
		row.BIBTEX.author = row.BIBTEX.author.replace(/{|}/g, "");
		row.BIBTEX.abstract = row.BIBTEX.abstract || "";
		row.BIBTEX.abstract = row.BIBTEX.abstract.trim();
		row.BIBTEX.abstract = row.BIBTEX.abstract.replace(/^Abstract:?\s*/i,"");
		row.BIBTEX.abstract = row.BIBTEX.abstract.replace(/"/g,"&quot;");
		row.BIBTEX.abstract = row.BIBTEX.abstract.replace(/\\&/g,"&");

		row.BIBTEX.url = row.BIBTEX.url || row.BIBTEX.howpublished;

		row.PUB.Title = row.BIBTEX.title;
		row.PUB.Author = row.BIBTEX.author;
		row.PUB.Year = row.BIBTEX.year || row.PUB.Year;

		if (!row.BIBTEX.doi && row.BIBTEX.url) {
			try {
				let doi = doiRegex().exec(row.BIBTEX.url)[0];
				row.BIBTEX.doi = doi;
			} catch(e) {

			}
		}
		return row;
	},
	BIBTEX: function(entry) {

	}
};

let updateChangeButtons = () => {
	let csvEdits = Object.keys(dbUpdates.csv).length;
	let bibEdits = Object.keys(dbUpdates.bib).length;

	let numEdits = "";
	if (csvEdits + bibEdits > 0) {
		numEdits = " (" + csvEdits + "/" + bibEdits+")";
	}

	$('.numChanges').toArray().forEach(button => {
		button = $(button);
		button.text(button.text().replace(/\([^\)]+\)/, "") + numEdits);
	});
};

let readDBUpdates = () => {
	if (!dbUpdates) {
		let ls = window.localStorage.getItem("databaseupdates");

		let resetDB = () => {
			dbUpdates = {csv:{},bib:{}};
			window.localStorage.setItem("databaseupdates", JSON.stringify(dbUpdates));
		};

		if (ls) {
			try {
				dbUpdates = JSON.parse(ls);
				if (!_.isObject(dbUpdates) || !dbUpdates.csv || !dbUpdates.bib) {
					throw new Error();
				}
			} catch (e) {
				console.warn("Database corrupted. Clearing all local changes");
				resetDB();
			}
		} else {
			resetDB();
		}
	}

	let csvUpdates = dbUpdates.csv;
	Object.entries(csvUpdates).forEach(([dbId, fields]) => {
		if (!Object.keys(fields).length) {
			delete csvUpdates[dbId];
		}
	})

	updateChangeButtons();
};

let saveDBUpdates = () => {
	window.localStorage.setItem("databaseupdates", JSON.stringify(dbUpdates));
	updateChangeButtons();
};

let duplicateEntry = function(dbid) {
	let entry = tableDataDbId[dbid];
	if (!entry) {
		return UIkit.modal.alert("Duplication failed because " + dbid + " is unknown ");
	}
	let clone = _.cloneDeep(entry);
	clone.DB.ID = generateDbId();
	clone.META.Name = "DUPLICATE";
	addNewEntry(clone);
}

let deleteEntry = function(dbid) {
	let entry = tableDataDbId[dbid];
	if (!entry) {
		return UIkit.modal.alert("Deletion failed because " + dbid + " is unknown ");
	}

	if (!originalDataDbId[dbid]) {
		delete dbUpdates.csv[dbid];
		updateChangeButtons();
		return;
	}

	onFieldUpdate(dbid,"META.SCOPE","DEL");
}

let createGitHubHTML = () => {
	readDBUpdates();
	if (!dbUpdates) {
		return console.error("No local changes to publish.");
	}

	let csvUpdates = dbUpdates.csv;
	let csvTable = "";
	if (Object.keys(csvUpdates).length) {
		csvTable = "<h2>Feature updates</h2><hr/><table class='localChangesTable'><thead><tr><th>Name</th><th>CitationKey</th><th>Field</th><th>Old</th><th>New</th><th>dbId</th><th>Revision</th></tr></thead><tbody>";

		Object.entries(csvUpdates).forEach(([dbId, fields]) => {
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
				csvTable += "<tr><td>" + [name, CitationKey, field, oldValue, newValue, dbId, revision].join("</td><td>") + "</td></tr>";
			})
		});

		 csvTable = csvTable + "</tbody></table>";

	}


	 let bibTable = "";
	 if (Object.keys(dbUpdates.bib).length) {
		bibTable = "<h2>BibTex updates</h2><hr/>";
		Object.entries(dbUpdates.bib).forEach(([citationKey,bibtexJson]) => {
			bibTable = bibTable + "<pre><code class='bibtex'>"+bibtexParse.toBibtex([bibtexJson],false)+"</code></pre>";
		 });
	}

	 let html = bibTable + "<br/>" + csvTable;
	 return html;
};


let sendGitHubIssue = async () => {
	let contentHTML = createGitHubHTML();
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
				let csvUpdates = dbUpdates.csv;
				Object.entries(csvUpdates).forEach(([dbId, fields]) => {
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
			let citeKey = cur.citationKey.toLowerCase();
			acc[citeKey] = cur.entryTags;
			acc[citeKey].entryType = cur.entryType;
			return acc;
		}, {}));
	});
};

let exportBibtex = function(dbIds) {
	let collection = Object.entries(bibtex).map(([citationKey,entryTags]) => {
		if (dbIds && !dbIds.includes(citationKey.toLowerCase())) return;
		let res =  JSON.parse(JSON.stringify({
			citationKey,
			entryTags,
			entryType: entryTags.entryType
		}));
		delete res.entryTags.entryType;
		return res;
	}).filter(x => x);
	console.log(collection);
	return bibtexParse.toBibtex(collection,false);
};

let bibtex,transformed;
let mergeCSVRowWithBibtex = function(row) {
	let citationKey = row.PUB.CitationKey;
	if (!citationKey) {
		return console.error("No CitationKey in CSV row", row);
	}
	row.BIBTEX = bibtex[citationKey.toLowerCase()];
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
				row.BIBTEX = bibtex[newKey.toLowerCase()];
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

	row.META.Description = row.META.Description || "";
	if (row.META.Description == row.BIBTEX.abstract) {
		row.META.Description = "";
	}
};

let getDbIdFromRow = (node) => {
	return table.row($(node).parents()).data().DB.ID;
};

let addNewEntry = function(row,draw) {
	//console.log("ADD NEW ENTRY");
	if (originalDataDbId[row.DB.ID] || tableDataDbId[row.DB.ID]) {
		return console.error("Row with same DB.ID is already present");
	}

	let CitationKey = row.PUB.CitationKey;

	let fieldUpdates = {};
	Object.entries(row).forEach(([mainField,subFields]) => {
		if (mainField == "BIBTEX") return;
		Object.entries(subFields).forEach(([subField,value]) => {
			if (mainField == "PUB" && subField != "CitationKey") return;
			if (!value) return;
			fieldUpdates[mainField+"."+subField ] = {
				CitationKey,REVISION:0,
				oldValue:"",
				newValue:value
			};
		});
	});
	dbUpdates.csv[row.DB.ID] = fieldUpdates;
	saveDBUpdates();
	//Add to table
	tableData.push(row);
	tableDataDbId[row.DB.ID] = row;
	table.row.add(row);
	tableDraw();
}

let onBibUpdate = (json) => {

	delete json.entryTags.file;

	//Add BibTex entry
	dbUpdates.bib[json.citationKey] = json;
	bibtex[json.citationKey.toLowerCase()] = json.entryTags;


	//Add CSV entry
	let entry = getEmptyCSVEntry();
	entry.PUB.CitationKey = json.citationKey;
	Importers.CSV(entry);

	addNewEntry(entry);
	//Save to database
	saveDBUpdates();
};

let tableDraw = _.debounce(function() {
	table.draw();
},250);

let shakePublishChangesButton = _.debounce(function() {
	let animation = "scale-down";
	let animClass = "uk-animation-" + animation;

	$('.numChanges').removeClass(animClass);
	setTimeout(() => {
		$('.numChanges').addClass(animClass);
	},10);
},200);

let onFieldUpdate = (id, field, value) => {
	if (value == "?") {
		value = "";
	}

	if (value.includes("\n")) {
		console.warn("Value includes linebreak, should be checked",id,field,value);
		debugger;
	}

	let tableEntry = tableDataDbId[id];
	let originalEntry = originalDataDbId[id];

	if (!tableEntry) {
		return console.error("Unknown entry", id);
	}

	let [mainField, subField] = field.split(".");

	let allowedMainFields = ["META","OUTPUT","EVAL","MAPPING"];
	if (!allowedMainFields.includes(mainField)) {
		return UIkit.modal.alert('Changes in ' + mainField + ' are not allowed.');
	}

	let originalValue = originalEntry ? originalEntry[mainField][subField] : "";

	readDBUpdates();
	let csvUpdates = dbUpdates.csv;
	csvUpdates[id] = csvUpdates[id] || {};

	if (originalValue == value) {
		delete csvUpdates[id][field];
		tableEntry[mainField][subField] = originalValue;
	} else {
		csvUpdates[id][field] = {
			CitationKey: tableEntry.PUB.CitationKey,
			REVISION: tableEntry.DB.REVISION,
			oldValue: originalValue,
			newValue: value
		};
		console.info("Added", id, field, value, "to database of local changes");
		tableEntry[mainField][subField] = value;
		shakePublishChangesButton();
	}

	saveDBUpdates();
};



(async () => {

	/*********************************/
	// Load BibTex and Feature data
	/*********************************/

	bibtex = await retrieveBibtex(config.bibtexFile);
	transformed = await loadCSV(config.csvFile, window.Papa);

	/*********************************/
	//Remove empty entries, cleanup
	//Call Importers
	/*********************************/
	transformed = transformed.map(row => {
		if (!row.PUB.CitationKey) {
			console.warn(row, "has no CitationKey, removed");
		};
		return row;
	}).filter(row => row.PUB.CitationKey);

	transformed.forEach(Importers.CSV);

	//Remove entries without bibtex
	transformed = transformed.map(row => {
		if (!row.BIBTEX) {
			console.warn(row, "has no BibTex entry, removed");
		};
		return row;
	}).filter(row => row.BIBTEX);


	/*********************************/
	//Split loaded data into
	//tableData (which includes modification) and
	//originalData (which resembles remote state)
	/*********************************/
	originalData = transformed;
	tableData = JSON.parse(JSON.stringify(transformed));
	transformed = false;

	originalData.forEach(row => {
		originalDataDbId[row.DB.ID] = row;
	});

	tableData.forEach(row => {
		tableDataDbId[row.DB.ID] = row;
	});


	/*********************************/
	//Read locally stored changes
	/*********************************/
	readDBUpdates();
	let haveLocalChangesBeenApproved = false;
	let haveLocalChangesBeenDiscarded = false;

	Object.entries(dbUpdates.bib).forEach(([citationKey, json]) => {

		if (bibtex[json.citationKey.toLowerCase()]) {
			haveLocalChangesBeenApproved = true;
			delete dbUpdates.bib[citationKey];
			saveDBUpdates();
			return;
		}

		//Add BibTex entry
		dbUpdates.bib[json.citationKey] = json;
		bibtex[json.citationKey.toLowerCase()] = json.entryTags;
	});

	//Create a CSV entries for new publications
	Object.entries(dbUpdates.csv).forEach(([dbId, fields]) => {
		if (!fields["DB.ID"]) return;

		let originalEntry = originalDataDbId[dbId];
		if (originalEntry) {
			haveLocalChangesBeenApproved = true;
			delete dbUpdates.csv[dbId];
			saveDBUpdates();
			return;
		}
		let entry = getEmptyCSVEntry();
		entry.PUB.CitationKey = fields["DB.ID"].CitationKey;
		entry.DB.ID = fields["DB.ID"].newValue;
		Importers.CSV(entry);
		tableData.push(entry);
		tableDataDbId[entry.DB.ID] = entry;
	});

	//Update CSV entries
	Object.entries(dbUpdates.csv).forEach(([dbId, fields]) => {
		let tableEntry = tableDataDbId[dbId];
		let originalEntry = originalDataDbId[dbId];
		if (!tableEntry) {

			//Was the missing entry marked for deletion before?
			if (fields["META.SCOPE"] && fields["META.SCOPE"].newValue.split(",").includes("DEL")) {
				delete dbUpdates.csv[dbId];
				haveLocalChangesBeenApproved = true;
				return;
			}

			console.warn(dbId, "not found, changes will be discarded");
			delete dbUpdates.csv[dbId];
			haveLocalChangesBeenDiscarded = true;
			return;
		}

		Object.entries(fields).forEach(([field, {newValue}]) => {
			let [mainField, subField] = field.split(".");

			if (originalEntry && originalEntry[mainField][subField] == newValue) {
				delete fields[field];
				if (!Object.keys(fields).length) {
					delete dbUpdates.csv[dbId];
				}
				haveLocalChangesBeenApproved = true;
				return;
			}

			tableEntry[mainField][subField] = newValue;
		});
	});

	// BibTex and Feature changes are now
	// included in tableData
	/*********************************/



	/*********************************/
	// Create table columns based on tabeFields.js
	/*********************************/
	columns = Object.entries(tableFields).map(([field, properties],i) => {
		let result = {};
		result.idx = i;
		result.data = field;
		result.title = properties.title || (field && field.toUpperCase().split(".").slice(-1)[0]);
		result.visible = properties.hide ? false : true;
		result.render = (properties.render && properties.render.transform) || false;
		result.editable = properties.editable;
		result.orderable = properties.orderable;
		result.orderSequence = properties.orderSequence;

		if (result.editable) {
			if (_.isObject(result)) {
				Object.entries(result.editable).forEach(([field,value]) => {
					if (value === 1) {
						result.editable[field] = toCamelCase(field.toLowerCase().replace(/_/g, " "));
					}
				});
			}
		}

		result.searchable = properties.searchable !== undefined ? properties.searchable : false;
		result.filter = properties.filter;
		if (result.filter) {
			result.searchable = true;
		}
		return result;
	}).filter(x => !!x);



	columnsById = columns.reduce((acc, cur) => {
		acc[cur.data] = cur;
		return acc;
	}, {});



	/*********************************/
	// Turn CSV fields with limited choices to SELECT/DROPDOWN fields
	/*********************************/
	let renderChoiceFields = function (data, type, obj, meta) {
		if (data && data == "?") data = "";

		if (type !== "display") return data;
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

				return '<li><input class="uk-checkbox" type="checkbox" id="' + choice + '" name="' + fieldIdx + '" value="' + choice + '"' + checked + ' /><label>' + choiceLabel + '</label></li>';
			}).join("\n");

			if (data && !match) {
				console.warn(obj.DB.ID, "has ", colOptions.data, " value of", data, "but should be one of", Object.keys(choices));
			}
			return "<fieldset class='uk-fieldset'><ul class='checkbox'>" + options + "</ul></fieldset>";
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
				console.warn(obj.PUB.CitationKey, "has ", colOptions.data, " value of", data, "but should be one of", Object.keys(choices));
			}
			return "<select class='uk-select' name='" + fieldIdx + "'>" + options + "</select>";

		}
	};

	columns.forEach(col => {
		if (!col.editable) return;
		if (col.editable === true) return;
		if (col.editable == "*") return; //text entry, will be handled via content-editable;
		col.render = renderChoiceFields;
	});


	columns.forEach(col => {
		//col.render = undefined;
	});


	$(document).ready(function () {
		/*********************************/
		// Prepare UI buttons
		/*********************************/
		let buttons = [
		{
			text: 'Visuals',
			action: (() => {
				let showVisuals = false;
				return function(evt,dt,button) {
					showVisuals = !showVisuals;
					if (showVisuals) {
						window.dispatchEvent(new Event("enableVisuals"));
						button.addClass("button-toggled");
					} else {
						window.dispatchEvent(new Event("disableVisuals"));
						button.removeClass("button-toggled");
					}
				}
			})()
		},{
			text: 'Export BibTex (All)',
			action: function () {
				let result = exportBibtex();
				$.fn.dataTable.fileSave(
					new Blob([result]),
					'ambientdirectory.bib'
				);
			}
		},{
			text: 'Export CSV (All)',
			action: function () {
				let rows = JSON.parse(JSON.stringify(tableData)).map(row => {
					delete row.BIBTEX;
					return row;
				}).filter(row => {
					return !row.META.SCOPE.split(",").includes("DEL");
				}).sort((a,b) => {
					return (a.DB.ID).localeCompare(b.DB.ID);
				});
				let result = exportCSV(rows, window.Papa);
				$.fn.dataTable.fileSave(
					new Blob([result]),
					'ambientdirectory.csv'
				);
			}
		},{
			text: 'Export BibTex (Filtered)',
			action: function () {
				let currentlyFilteredIdx = table.rows({"search" : "applied"})[0]
				let dbIds = _.uniq(table.rows(currentlyFilteredIdx).data().map(d => d.PUB.CitationKey.toLowerCase()));
				let result = exportBibtex(dbIds);
				$.fn.dataTable.fileSave(
					new Blob([result]),
					'ambientdirectoryfiltered.bib'
				);
			}
		},{
			text: 'Export CSV (Filtered)',
			action: function () {
				let currentlyFilteredIdx = table.rows({"search" : "applied"})[0]
				let selectedTableData = tableData.filter((x,i) => currentlyFilteredIdx.includes(i));

				let rows = JSON.parse(JSON.stringify(selectedTableData)).map(row => {
					delete row.BIBTEX;
					return row;
				}).filter(row => {
					return !row.META.SCOPE.split(",").includes("DEL");
				}).sort((a,b) => {
					return (a.DB.ID).localeCompare(b.DB.ID);
				});
				let result = exportCSV(rows, window.Papa);
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

				let atLeastOneUpdate = Object.keys(dbUpdates.csv).length + Object.keys(dbUpdates.bib).length;

				if (!atLeastOneUpdate) {
					return UIkit.modal.alert('You haven\'t made any new changes that would need publishing. You can continue editing most data fields simply by clicking in them.');
				}
				let contentHTML = createGitHubHTML();
				$('#githubIssueText').html(contentHTML);
				UIkit.modal($('#modal-container')[0]).show();
			}
		}, {
			text: "Clear Changes",
			className: 'numChanges',
			action: () => {
				Object.entries(dbUpdates.bib);
				Object.entries(dbUpdates.csv).forEach(([dbId,updates]) => {
					if (!updates["DB.ID"]) return;

					tableData = tableData.filter(row => row.DB.ID !== dbId);
					delete tableDataDbId[dbId];

					let row = table.row($('#' + dbId).parents("tr"));
					if (row) {
						table.row(row).remove().draw();
					}
				});

				dbUpdates = {csv:{},bib:{}};
				window.localStorage.setItem("databaseupdates", JSON.stringify(dbUpdates));
				readDBUpdates();
				UIkit.modal.alert('Local changes have been cleared. In order to revert displayed cells to their original state, please reload the page.')
			}
		}/*, {
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
			text: "Toggle Output",
			action: (() => {
				let visible = false;
				return function (e, dt) {
					visible = !visible;
					for (let col = 10 + 6; col < 10 + 6 + 6; col++) {
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
					for (let col = 10 + 6 + 6; col < 10 + 6 + 6 + 8; col++) {
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
					for (let col = 10 + 6 +6 +8; col < 10+6+6+6+8+9; col++) {
						dt.column(col).visible(visible);
					}
				}
			})()
		}*/
	];
		buttons.forEach(button => {
			button.className = (button.className || "") + ' uk-button uk-button-default';
		});

		enableEditing();

		aoColumnDefs = columns.map((col, i) => {
			return {
				sClass: col.sClass || (col.data ? col.data.replace(".", "-") : undefined),
				aTargets: [i]
			}
		});

		$.fn.dataTable.ext.search.push(
			function( settings, data, dataIndex ) {
				let found = true;
				Object.values(activeFilterFunctions).forEach(fn => {
					if (!found) return;
					found = found && fn(settings,data,dataIndex);
				});

				return found;
			}
		);

		let tableElem = $('#example');

		window.disableUIKitUpdates();

		let fragmentedRendering = true;

		if (fragmentedRendering) {

			var parent = tableElem.parent();
			var fragment = document.createDocumentFragment();

			$(fragment).css({
				width:'960px'
			});

			tableElem.appendTo(fragment);

		}
		table = tableElem.DataTable({
			data: tableData,
			aoColumnDefs,
			dom: 'BfrtipS',

			columns,
			deferRender: true,
			"createdRow": function( row, data, dataIndex ) {
				//console.log("CREATED ROW");
			},
//			"processing": true,
			keys: false,

//			"paging": true,

			scrollX: true,
			scrollY: window.innerHeight*0.75, //TODO: Should be in relation to actual window height
			scroller: true,
			scrollCollapse: false,
			autoWidth: false,
			fixedColumns: {
				leftColumns: 3
			},
			mark:false,
			buttons
		});

		if (fragmentedRendering) {
			$(fragment).appendTo(parent)
		}

		/*********************************/
		//Scrolling and Fixed Columns don't work well
		//This is an override to hide fixed columsn by default
		//and only show them when the table is scrolled to the left
		//or 350ms after having scrolled down
		/*********************************/

		let scrollContainer = $('.dataTables_scrollBody');
		let areColumnsFixed = false;
		let lastTopScrollPos;
		$('.DTFC_LeftBodyLiner table').css("display",areColumnsFixed ? "block":"none");


		let showColumnsAftersTopScrollTimer;
		let showColumnsAftersTopScroll = function() {
			showColumnsAftersTopScrollTimer = clearTimeout(showColumnsAftersTopScrollTimer);
			showColumnsAftersTopScrollTimer = setTimeout(() => {
				$('.DTFC_LeftBodyLiner table').fadeIn(500);
				areColumnsFixed = true;
			},350);
		}

		scrollContainer.on("scroll",() => {

			let leftScrolled = scrollContainer.scrollLeft() > 0;
			let topScrolled = lastTopScrollPos && (scrollContainer.scrollTop() - lastTopScrollPos);
			lastTopScrollPos = scrollContainer.scrollTop();

			topScrolled = Math.abs(topScrolled) > 100;


			let showFixedColumns;
			if (!leftScrolled) {
				showFixedColumns = false;
			} else {
				if (topScrolled) {
					showFixedColumns = false;
				} else {
					showFixedColumns = true;
				}
			}

			if (showFixedColumns) {
				if (showFixedColumns != areColumnsFixed) {
					showColumnsAftersTopScrollTimer = clearTimeout(showColumnsAftersTopScrollTimer);
					$('.DTFC_LeftBodyLiner table').fadeIn(500);
					areColumnsFixed = true;
				}

			} else {
				showColumnsAftersTopScrollTimer = clearTimeout(showColumnsAftersTopScrollTimer);
				areColumnsFixed = false;
				$('.DTFC_LeftBodyLiner table').hide();
				if (topScrolled) {
					showColumnsAftersTopScroll();
				}
			}
		});
		/*********************************/

		new $.fn.dataTable.Debounce(table, 500);
		$('#loadingIndicator').fadeOut()
		updateChangeButtons();

		/*********************************/
		// Show notification about approved or discard changes
		/*********************************/

		setTimeout(() => {
			if (haveLocalChangesBeenApproved) {
				if (Object.keys(dbUpdates.csv).length) {
					UIkit.notification('Yay, some of your local changes have been approved remotely. Thank you for your contributions!')
				} else {
					UIkit.notification('Good news! all of your local changes have been approved remotely. Thank you for your contributions!')
				}
				saveDBUpdates();
				updateChangeButtons();
			}

			if (haveLocalChangesBeenDiscarded) {
				UIkit.modal.alert('Some of your local changes were discarded, most likely because some of the publications you have made changes to have been removed from the directory in the meantime.')
				saveDBUpdates();
				updateChangeButtons();
			}
		},1500);


		/*********************************/
		// Add per row button functionality (duplicate,delete)
		/*********************************/

		$('#example tbody').on( 'click', 'a.action-row-duplicate', function () {
			let tr = $(this).parents('tr');
			if (!tr) return;

			let row = table.row(tr);
			if(!row) return;
			duplicateEntry(row.data().DB.ID);
		} );

		$('#example tbody').on( 'click', 'a.action-row-delete', function () {
			let tr = $(this).parents('tr');
			if (!tr) return;

			let row = table.row(tr);
			if(!row) return;
			deleteEntry(row.data().DB.ID);
			row.remove().draw();
		} );


		/*********************************/
		// Load plugins
		/*********************************/

		//
		enableDragDrop();
		showAutoFilter(table,tableData,columnsById);
		enableSearchShortcut();
		enableParCoords($('#parcoords'));
	});
})();

