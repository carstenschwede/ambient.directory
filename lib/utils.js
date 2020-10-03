
function toCamelCase(str) {
	if (str.indexOf("[") == 0) return str;

	return str.replace(/_/g," ").replace(/\w\S*/g, function (txt) {
		return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
	});

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

