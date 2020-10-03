//AutoFilter
let enableAutoFilter = function(table,tableData,columnsById) {
	let ths = $('.dataTables_scrollHead th').toArray();
	ths = ths.concat($('.DTFC_LeftHeadWrapper th').toArray());
	ths.forEach(th => {
		let field = (th.className || "").split(" ").map(fieldName => {
			return fieldName.trim().replace("-", ".");
		}).filter(fieldName => columnsById[fieldName])[0];


		if (!field) return;
		let columnDesc = columnsById[field];
		if (!columnDesc.filter) return; //console.warn("NOT FILTER");

		let limitedChoice = _.isArray(columnDesc.editable) || _.isObject(columnDesc.editable);

		let column = table.column(columnDesc.idx);

		if (columnDesc.filter == "*") {

			var select = $('<br/><input type="text"/>')
			.appendTo( $(th) )
			.on( 'input', _.debounce(function () {
				//var val = $.fn.dataTable.util.escapeRegex($(this).val());
				let val = $(this).val();
				console.log("SEARHCING FOR",val);
				column.search(val,false, false ).draw();
				return false;
			},350));
		} else {

			var select = $('<br/><select></select>')
			.appendTo( $(th) )
			.on( 'change', function () {
				//var val = $.fn.dataTable.util.escapeRegex($(this).val());
				let val = $(this).val();
				console.log("SEARHCING FOR",val);
				column.search(val,true, false ).draw();
				return false;
			} );



			let [mainField,subField] = field.split(".");


			let colValues = {
				"*": {
					value: "",
					label: "[All]",
					count: 0
				},
				"Empty": {
					value: (/^\s*$/).source,
					label: "[Empty]",
					count: 0
				},
				"+": {
					value: (/\S/).source,
					label: "[Not Empty]",
					count: 0
				}
			};


			if (columnDesc.filter.transform) {
				_.flatten(tableData.map(row => {
					return columnDesc.filter.transform(row[mainField][subField]);
				})).forEach(val => {
					colValues[val] = colValues[val] || {
						value: val,
						label: String(val),
						count: 0
					};
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
									count: 0
								};
							});
						} else {
							Object.entries(columnDesc.editable).forEach(([val,label]) => {
								colValues[val] = {
									value: val,
									label: String(label),
									count: 0
								};
							})
						}
					}
				}

				_.flatten(tableData.map(row => {
					let val = row[mainField][subField];
					if (_.isString(val)) return val.split(","); else return val;
				})).forEach(val => {
					colValues["*"].count++;
					if (!_.isString(val) && !_.isNumber(val)) return;

					if (val == "") {
						colValues["Empty"].count++;
						return;
					}

					if (colValues[val]) {
						colValues[val].count++;
					} else {
						colValues[val] = {
							value: val,
							label: String(val),
							count: 1
						};
					}

					colValues["+"].count++;
				});
			}

			//Sort possible column values so that "[...]" entries appear before other sorted values
			let colValuesA = Object.entries(colValues).filter(([val,desc]) => desc.label.indexOf("[") == 0);

			let colValuesB = Object.entries(colValues).filter(([val,desc]) => desc.label.indexOf("[") != 0).sort((a,b) => {
				return String(a[1].label).localeCompare(String(b[1].label));
			});

			_.flatten([colValuesA,colValuesB]).forEach( ( [val,desc] ) => {
				select.append( '<option value="'+desc.value+'">'+desc.label+' (' + desc.count + ')</option>' )
			} );
		}

	});
	table.draw();
};