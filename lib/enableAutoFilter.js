let parseSearchPattern = function(pattern) {
	let isRegExp = pattern.split("/").length == 3;

	let smartSearch = false, isCaseInsen = true;
	let k,modifiers,regExpStr;
	if (isRegExp) {
		smartSearch = false;
		isCaseInsen = false;
		[k,regExpStr,modifiers] = pattern.split("/");
		if (modifiers && modifiers.indexOf("i") > -1) {
			isCaseInsen = true;
		}
		//table.search(regExpStr,isRegExp, smartSearch,isCaseInsen ).draw();
	} else {
		smartSearch = true;
		isCaseInsen = true;
		//table.search(pattern,isRegExp,smartSearch,isCaseInsen ).draw();
	}

	return {
		pattern,isRegExp,regExpStr,isCaseInsen,modifiers
	}
}


$.fn.dataTable.Debounce = function (table, delayMs) {
	var tableId = table.settings()[0].sTableId;
	$('.dataTables_filter input[aria-controls="' + tableId + '"]') // select the correct input field
		.unbind() // Unbind previous default bindings
		.bind('input', (delay(function (e) { // Bind our desired behavior
			let val = $(this).val();

			/*
			columns.forEach((colDesc,idx) => {
				let textSearch = colDesc.filter === "*" || colDesc.searchable;
				if (textSearch) {
					let col = table.column(colDesc.idx);
					col.search(val).draw();
					console.log("SEARCHING",colDesc.idx,colDesc.title,val,col);
				}
			});
*/
			table.columns(0).search("");

			let searchPattern = parseSearchPattern(val);
			if (searchPattern.isRegExp) {
				table.search(searchPattern.regExpStr,true, false,searchPattern.isCaseInsen).draw();
			} else {
				table.search(val,false,true,true ).draw();
			}

			//table.search(val).draw();

			if (val) {
				$(this).addClass("highlight");
			} else {
				$(this).removeClass("highlight");
			}
			updateCounters(true);

			setTimeout(() => {
				window.dispatchEvent(new Event("updateVisuals"));

			},100);

		}, delayMs))); // Set delay in milliseconds
}


let autoFilterInitComplete = false;

let showAutoFilter = function(a,b,c) {
	if (!autoFilterInitComplete) {
		enableAutoFilter(a,b,c);
		autoFilterInitComplete = true;
	} else {
		updateCounters(true);
		$('.autofilter').show();
	}
}

let hideAutoFilter = function() {
	let filterElems = $('.autofilter');
	filterElems.hide();
	$('select.autofilter option').attr('selected',false).trigger('change');
	$('input.autofilter').val('').trigger('input');

}

let countersNeedUpdate = false;
let updateCounters = () => {};
window.disableUIKitUpdates = () => {};
window.enableUIKitUpdates = () => {};

//AutoFilter

let enableAutoFilter = function(table,tableData,columnsById) {
	let textSearchRows = [];
	let highlightedColumns = {};

	let filterValues = {};

	let selectorCache = {};
	let _$ = function(selector) {
		let cached = selectorCache[selector];
		if (cached) return cached;
		selectorCache[selector] = $(selector);
		return selectorCache[selector];
	};

	updateCounters = _.debounce(function(force,debug) {
		//if (!Object.keys(highlightedColumns).length) return console.warn("NO HIGHLIGHTED COLUMNS")
		if (!force && !countersNeedUpdate) return console.warn("NO COUNTER UPDATES NEEDED");
		countersNeedUpdate = false;
		console.log("Updating Autofilter counts");
		updateTextHighlights();



		Object.entries(highlightedColumns).forEach(([name,onoffval]) => {
			let {onoff,val} = onoffval;
			if (!onoff) {
				delete highlightedColumns[name];
				return;
			}
			let res = filterValues[name].filter( fv => fv.val == val);
			res = res[0];
			if (!res) {
				//console.log(filterValues[name],name,val,"not found")
				return;
			}
			res = res.desc;
			highlightedColumns[name].columnActiveIdx = res.idx;
		});


		let filterValueEntries = Object.entries(filterValues);

		let currentlyFilteredIdx = table.rows({"search" : "applied"})[0]

		if (debug) {
			debugger;
		}
		let delayedIteration = 20;
		let asyncFilterValueIterate = function() {
			if (!filterValueEntries || !filterValueEntries.length) return;
			let [field,fV] = filterValueEntries.shift();
			let fieldClass = field.replace(".","-");
			let selector = 'select.autofilter[field="' + fieldClass + '"]';

			let selects = _$(selector);
			if (!selects.length) return setTimeout(asyncFilterValueIterate,delayedIteration);// console.warn("select not found",selector)

			selects.toArray().forEach(select => {
				let options = $(select).children().toArray();
				//console.log("select has",options.length,"options");

				options.forEach((option,i) => {
					option = $(option);
					let {val,desc} = fV[i];


					let activeIdx = {};
					let numFilters = 0;



					Object.entries(highlightedColumns).forEach(([columnField,onoffval]) => {
						if (columnField == field) return;

						let {onoff,val,columnActiveIdx} = onoffval;
						if (!columnActiveIdx) return;
						numFilters++;
						Object.keys(columnActiveIdx).forEach(key => {
							activeIdx[key] = activeIdx[key] || 0;
							activeIdx[key]++;
						});
					});


					if (textSearchRows.length > 0) {
						numFilters++;
						textSearchRows.forEach(idx => {
							activeIdx[idx] = activeIdx[idx] || 0;
							activeIdx[idx]++;
						});
					}


					let andIdx = Object.entries(activeIdx).filter(([idx,count]) => {
						return count == numFilters;
					}).map(([idx,count]) => idx);

					let count = Object.keys(desc.idx).filter(idx => !andIdx.length || andIdx.includes(idx)).length;

					let text = desc.label + " (" + count + ")";
					option.text(text);
				});

			});
			setTimeout(asyncFilterValueIterate,delayedIteration);
		};
		asyncFilterValueIterate();
	},50);

	table.on( 'draw', function () {
		let newtextSearchRows = JSON.parse(JSON.stringify(table.rows({"search" : "applied"})[0])).map(k => parseInt(k)).sort((a,b) => a-b).map(k => k.toString())

		if (textSearchRows.join(",") != newtextSearchRows.join(",")) {
			countersNeedUpdate = true;
			textSearchRows = newtextSearchRows;
		}

		Object.entries(highlightedColumns).forEach(([name,desc]) => {
			let {onoff,val,columnActiveIdx} = desc;
			if (columnActiveIdx) {
				_.pullAll(textSearchRows,Object.keys(columnActiveIdx));
			}
			let ths = $('th.' + name.replace(".","-"));
			//console.log(name,onoff,"HIGHGLITH CLASS");
			if (onoff) {
				ths.addClass("highlight");
			} else {
				ths.removeClass("highlight");
				//delete highlightedColumns[name];
			}
		});
		window.highlightedColumns = highlightedColumns;
		window.textSearchRows = textSearchRows;
		updateCounters();
	});

	let setColumnHighlight = function(field,onoff,val) {
		countersNeedUpdate = true;


		highlightedColumns[field] = {
			onoff,val
		};
		updateCounters();
		setTimeout(() => {
			window.dispatchEvent(new Event("updateVisuals"));
		},100);
	}

	let ths = $('.dataTables_scrollHead th').toArray();
	ths = ths.concat($('.DTFC_LeftHeadWrapper th').toArray());
	window.disableUIKitUpdates();

	ths.forEach(th => {
		let field = (th.className || "").split(" ").map(fieldName => {
			return fieldName.trim().replace("-", ".");
		}).filter(fieldName => columnsById[fieldName])[0];


		if (!field) return;
		let fieldClass = field.replace(".","-");
		let columnDesc = columnsById[field];
		if (!columnDesc.filter) return; //console.warn("NOT FILTER");

		let limitedChoice = _.isArray(columnDesc.editable) || _.isObject(columnDesc.editable);

		let column = table.column(columnDesc.idx);


		filterValues[field] = [];


		if (columnDesc.filter == "*") {
			let oldValue;
			let inputHandler = _.debounce(function (elem) {
				let val = $(elem).val();
				if (val == oldValue) return;
				oldValue = val;

				let isRegExp = val.split("/").length == 3;
				//console.log("Searching",field,val,isRegExp);
				setColumnHighlight(field,val && val !== "",val);

				let smartSearch = false, caseInsen = true;
				if (isRegExp) {
					smartSearch = false;
					caseInsen = false;
					let [k,regExpStr,modifiers] = val.split("/");
					if (modifiers && modifiers.indexOf("i") > -1) {
						caseInsen = true;
					}
					column.search(regExpStr,isRegExp, smartSearch,caseInsen ).draw();
				} else {
					smartSearch = true;
					caseInsen = true;
					column.search(val,isRegExp,smartSearch,caseInsen ).draw();
				}
			},1000);

			let tooltip = "Substring or regexp (e.g. /\\bLED\\b/)";
			var select = $('<br/><input class="autofilter" type="text" uk-tooltip="'+tooltip+'"/>')
			.appendTo( $(th) )
			.on('click', function(evt) {
				evt.stopPropagation();
				return false;
			})
			.on( 'input', function(evt) {
				evt.stopPropagation();
				inputHandler(this);
				return false;
			});
		} else {

			let oldValue = false;
			var select = $('<br/><select class="autofilter" field="'+fieldClass+'"></select>')
			.appendTo( $(th) )
			.on('click', function(evt) {
				evt.stopPropagation();
				return false;
			})
			.on( 'change', function () {

				//var val = $.fn.dataTable.util.escapeRegex($(this).val());
				let val = $(this).val();
				if (oldValue == val) return;
				console.log("CHANGE EVENT",oldValue,val)
				oldValue = val;
				delete activeFilterFunctions[columnDesc.idx];
				//console.log("SEARHCING FOR",val);
				if (columnDesc.filter.values && columnDesc.filter.values[val]) {
					let filterOptions = columnDesc.filter.values[val];
					if (filterOptions.fn) {
						//console.log("APPLYING FILTER FN",filterOptions.fn);
						activeFilterFunctions[columnDesc.idx] = function(settings,data,dataIndex) {
							let val = data[columnDesc.idx];
							return filterOptions.fn(val);
						};

						//column.data().filter(filterOptions.fn).draw();
						table.draw();
						return;
					}
				}
				//console.log("SEARHCING FOR",val,columnDesc,columnDesc.filter);
				setColumnHighlight(field,val && val !== "",val);
				if (val === "?") {
					val = "^\\?$";
				}
				column.search(val,true, true,true ).draw();
				return false;
			} );



			let [mainField,subField] = field.split(".");


			let colValues = {
				"*": {
					value: "",
					label: "[All]",
					count: 0,
					idx: {}
				},
				"Empty": {
					value: (/^\s*$/).source,
					label: "[Empty]",
					count: 0,
					idx: {}
				},
				"+": {
					value: (/\S/).source,
					label: "[Not Empty]",
					count: 0,
					idx: {}
				}
			};

			if (columnDesc.filter.values) {
				colValues = _.merge(colValues,columnDesc.filter.values);
			}

			if (columnDesc.filter.values) {
				Object.entries(columnDesc.filter.values).forEach(([val,desc]) => {
					if (!desc.fn) return;
					desc.count = tableData.filter((row,idx) => {
						let result = desc.fn(row[mainField][subField]);
						if (result) {
							desc.idx[idx] = true;
						}
						return result;
					}).length;
				});
			}


			if (columnDesc.filter.transform) {
				_.flatten(tableData.map((row,idx) => {
					let transformedValues = columnDesc.filter.transform(row[mainField][subField]);
					return transformedValues.map(tV => {
						return {idx,val:tV};
					});
				})).forEach(({val,idx}) => {
					colValues["*"].idx[idx] = true;
					colValues["*"].count++;
					if (val) {
						colValues["+"].idx[idx] = true;
						colValues["+"].count++;
					} else {
						colValues["Empty"].idx[idx] = true;
						colValues["Empty"].count++;
					}
					colValues[val] = colValues[val] || {
						value: val,
						label: String(val),
						count: 0,
						idx: {}
					};
					colValues[val].idx[idx] = true;
					colValues[val].count++;
				})
			} else {
				if (columnDesc.editable) {
					if (_.isArray(columnDesc.editable) || _.isObject(columnDesc.editable)){
						if (_.isArray(columnDesc.editable)) {
							columnDesc.editable.forEach(val => {
								colValues[val] = {
									value: val,
									label: toCamelCase(val),
									count: 0,
									idx: {}
								};
							});
						} else {
							Object.entries(columnDesc.editable).forEach(([val,label]) => {
								colValues[val] = {
									value: val,
									label: String(label),
									count: 0,
									idx: {}
								};
							})
						}
					}
				}

				let tk =_.flatten(tableData.map((row,idx) => {
					let val = row[mainField][subField];
					if (_.isString(val)) return val.split(",").map(v => {
						return {val:v,idx};
					}); else return {val,idx};
				}));

				tk.forEach(({val,idx}) => {
					colValues["*"].idx[idx] = true;
					colValues["*"].count++;
					if (!_.isString(val) && !_.isNumber(val)) return;

					if (val == "") {
						colValues["Empty"].idx[idx] = true;
						colValues["Empty"].count++;
						return;
					}

					if (colValues[val]) {
						colValues[val].idx[idx] = true;
						colValues[val].count++;
					} else {
						colValues[val] = {
							value: val,
							label: String(val),
							count: 1,
							idx: {
								[idx]: true
							}
						};
					}

					colValues["+"].idx[idx] = true;
					colValues["+"].count++;
				});
			}

			//console.log(colValues);

			//Sort possible column values so that "[...]" entries appear before other sorted values
			let colValuesA = Object.entries(colValues).filter(([val,desc]) => desc.label.indexOf("[") == 0);

			let colValuesB = Object.entries(colValues).filter(([val,desc]) => desc.label.indexOf("[") != 0).sort((a,b) => {
				return String(a[1].label).localeCompare(String(b[1].label));
			});

			let allValues = _.flatten([colValuesA,colValuesB]).filter( ( [val,desc]) => {
				if (val == "$multiple") return false;
				return true;
			});

			allValues.forEach(([val,desc],idx) => {
				filterValues[field].push({val,desc});
				let counterId = "option_" + fieldClass + "_" + idx;
				select.append( '<option id="'+counterId+'" value="'+(desc.value !== undefined ? desc.value : val)+'">'+desc.label+' (' + Object.keys(desc.idx).length + ')</option>' )
			} );
			updateCounters();

		}
	});


	table.draw();
};