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

let exportCSV = (rows,Papa,headers) => {
	let csvRows = rows.map(row => {
		let result = {};
		if (headers) {
			headers.forEach(header => {
				let [field,subField] = header.split(".");
				result[header] = row[field][subField];;
			});
		} else {
			Object.entries(row).forEach(([mainField,subFields]) => {
				Object.entries(subFields).forEach(([subField,value]) => {
					result[mainField+"."+subField ]= value;
				});
			});
		}
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