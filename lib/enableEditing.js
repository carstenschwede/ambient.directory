let enableEditing = function() {
	let lastHighlightedRow = false;

$('#example').click((clickEvt) => {
	let tag = clickEvt.target.tagName;

	let affectedRowsIdx = [];

	let newNode = clickEvt.target;
	let field;


	let detailsClasses = ["BIBTEX-abstract","BIBTEX-title","BIBTEX-author","BIBTEX-year"];

	let td = $(newNode);
	if (td[0].tagName !== "TD") {
		td = td.parents("td");
	}

	let clickOnDetail = detailsClasses.reduce((acc,cur) => {
		acc = acc || td.hasClass(cur);
		return acc;
	},false);
	if (clickOnDetail) {
		let absCon = $('#abstract-container');

		let tr  =$(newNode).parents("tr");
		tr.addClass("highlighted");


		if (lastHighlightedRow) {
			lastHighlightedRow.removeClass("highlighted");
			lastHighlightedRow = false;
		}

		lastHighlightedRow = tr;

		let row = table.row(tr);
		let entry = row.data();
		let abstract = entry.BIBTEX.abstract;

		let header = entry.BIBTEX.title;
		if (entry.BIBTEX.year) {
			header += " (" + entry.BIBTEX.year + ")";
		};

		$('#abstract-title').html(header);
		let authors = entry.BIBTEX.author;
		authors = authors.split(" and ").map(author => author.split(", ").reverse().join(" ")).join(", ");
		$('#abstract-authors').html(authors);
		$('#abstract-text').html(abstract || "");
		UIkit.offcanvas(absCon).show();
		updateTextHighlights();

		absCon.one("hide",() => {
			lastHighlightedRow.removeClass("highlighted");
			lastHighlightedRow = false;
		});

		return;
	}

	let parent = newNode;
	while (!field && parent) {
		field = (parent.className || "").split(" ").map(fieldName => {
			return fieldName.trim().replace("-", ".");
		}).filter(fieldName => columnsById[fieldName] && columnsById[fieldName].editable)[0];
		parent = parent.parentNode;
	}
	console.log(newNode,clickEvt);
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

			//TODO should be more efficient to do table.rows().columns(field-selector).nodes()
			affectedRowsIdx.forEach(idx => {
				let row = tableData[idx];
				let dbId = row.DB.ID;

				let result = {
					row
				};
				let trRow = $('#' + dbId).parents("tr")[0];
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

						onFieldUpdate(row.row.DB.ID, field, newValues.filter(x => !!x).join(","));
						updatedCounter++;
					});
					if (updatedCounter) {
						UIkit.notification(updatedCounter + ' entries have been updated.', {status: 'success'})
					} else {
						UIkit.notification('No entries were updated.', {status:'warning'});
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
						UIkit.notification(updatedCounter + ' entries have been updated.', {status: 'success'})
					} else {
						UIkit.notification('No entries were updated.', {status:'warning'});
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
};