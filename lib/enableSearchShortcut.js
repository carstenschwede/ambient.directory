
let enableSearchShortcut = function() {
	//Map browser search to within-site search
	function KeyPress(e) {
		var evtobj = window.event ? window.event : e;
		let isSearchShortcut = (evtobj.keyCode == 70 && evtobj.metaKey);
		if (isSearchShortcut) {
			console.info("Detected search shortcut");
			$('input[type=search]').focus().select();
			return false;
		}
	}

	document.onkeydown = KeyPress;
};