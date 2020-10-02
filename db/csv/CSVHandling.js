/*
let csvHeaders = ["DB.ID","DB.REVISION",
							"PUB.CitationKey",
							"PUB.Title",
							"PUB.Author",
							"PUB.Year",
							"PUB.Link",
							"PUB.Citations",
							"META.Name",
							"META.Description",
							"META.SPECIFIC_NEW_USE_CASE",
							"META.SCOPE",
							"META.GOAL",
							"META.TOPIC",
							"META.SETTING",
							"MAPPING.HAS_MAPPING",
							"MAPPING.FROM",
							"MAPPING.ORIGIN",
							"MAPPING.TO",
							"MAPPING.CONCEPT",
							"MAPPING.REPRESENTATION",
							"MAPPING.MEANING",
							"MAPPING.LEVEL",
							"OUTPUT.ACTIVATION",
							"OUTPUT.TRANSITION_TO_FOREGROUND",
							"OUTPUT.MEDIUM",
							"OUTPUT.MODALITY",
							"OUTPUT.LOCALIZATION",
							"OUTPUT.ACCESS",
							"OUTPUT.INFORMATION_BANDWIDTH",
							"EVAL.SAMPLE_SIZE",
							"EVAL.TIME_PERIOD",
							"EVAL.SETTING",
							"EVAL.STUDY_GROUP",
							"EVAL.DEVSTAGE",
							"EVAL.USABILITY",
							"EVAL.COGNITIVE_LOAD",
							"EVAL.CHANGED_BEHAVIOUR"];
							*/

let csvHeaders;
let convertCSV = function(results) {
	csvHeaders = results[0];
	results = results.slice(1);
	let transformed = results.map(row => {
		let result = csvHeaders.reduce((acc,cur,idx) => {
			if (!cur) return acc;
			row[idx] = row[idx].trim();
			let [field,subField] = cur.split(".");
			acc[field] = acc[field] || {};

			if (cur == "DB.REVISION") {
				row[idx] = parseInt(row[idx]);
			}

			if (cur == "META.SCOPE") {
				row[idx] = row[idx].toUpperCase();
			}

			acc[field][subField] = row[idx];
			return acc;
		},{});
		return result;
	});

	return transformed;
}

let parseCSV = function(csvString,Papa) {
	return new Promise((resolve,reject) => {
		Papa.parse(csvString, {
			complete: results => {
				resolve(convertCSV(results.data));
			}
		});
	});
}

let loadCSV = function(url,Papa) {
	return new Promise((resolve,reject) => {
		Papa.parse(url, {
			download: true,
			complete: results => {
				resolve(convertCSV(results.data));
			}
		});
	});
};

let exportCSV = (rows,Papa) => {
	if (!csvHeaders) {
		return console.error("CSV has not been loaded yet, can't export anything");
	}
	let csvRows = rows.map(row => {
		let result = {};
		csvHeaders.forEach(header => {
			let [field,subField] = header.split(".");
			result[header] = row[field][subField];;
		});
		return result;
	});
	let result = Papa.unparse(csvRows,{
		header: true
	});
	return result;
};

let CSVHandling = {
	parseCSV,loadCSV,exportCSV
};

(function (global) {
    'use strict';
    // AMD support
    if (typeof define === 'function' && define.amd) {
        define(function () { return CSVHandling; });
    // CommonJS and Node.js module support.
    } else if (typeof exports !== 'undefined') {
        // Support Node.js specific `module.exports` (which can be a function)
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = CSVHandling;
        }
        // But always support CommonJS module 1.1.1 spec (`exports` cannot be a function)
        exports.CSVHandling = CSVHandling;
    } else {
        global.CSVHandling = CSVHandling;
    }
})(this);