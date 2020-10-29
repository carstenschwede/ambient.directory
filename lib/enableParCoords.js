let enableParCoords = function(visualContainer) {
	let enabled = false;
	let enableVisuals = () => {
		enabled = true;
		visualContainer.show();
		updateVisuals();
	};

	let disableVisuals = () => {
		table.columns(0).search("").draw();
		enabled = false;
		visualContainer.hide();
	};

	window.addEventListener("enableVisuals",enableVisuals);
	window.addEventListener("disableVisuals",disableVisuals);

	disableVisuals();

	let updateVisuals = function() {
		if (!enabled) return;
		table.columns(0).search("");

		let rows = table.rows({"search" : "applied"})[0];
		let rowsData = rows.map(rowIdx => {
			d = table.row(rowIdx).data();
			d.idx = rowIdx;
			return d;
		});


		let ValueToIcon = {
			"TUI":"🎲",
			"UI":"🖥",
			"IOT":"📟",
			"AMI":"🧠",
			"ADAIS":"🎁",
			"AS":"🔮",


			"VISUAL":"👓",
			"AUDIO":"🎧",
			"TASTE":"👅",
			"HEAT":"🔥",
			"SHAPE":"🐡",
			"SMELL":"👃",
			"POS":"🎈",
			"HAPTIC":"🖐",

			"WORKPLACE":"💼",
			"MEDICAL":"🩺",
			"HEALTH":"🌡",
			"TRAVEL":"🗿",

			"BEHAVIOURAL_CHANGE":"🚬",

			"ART":"🖼",
			"MOTOR":"⚙️",
			"USECASE":"📕",
			"DEFTAX":"🏷",
			"NOTIFICATION":"⏰",
			"GROUP":"👯",
			"CONCEPT":"📝",
			"EVAL":"📊",
			"PARTNERSHIP":"🧑‍🤝‍🧑",
			"EVENTS":"🎟",
			"FAMILY":"👨‍👩‍👦",
			"HOME":"🏠",
			"PERSONAL":"🧬",
			"HOUSEHOLD":"🏠",
			"DEV":"🏗",
			"PROTOTYPE":"🛴",
			"SPEAKER":"🔈",
			"FOOD":"🥐",
			"NUTRITION":"🥝",
			"EXERCISE":"💪",
			"EDUCATION":"👩‍🎓",
			"TRAVEL":"✈",
			"USER":"🙋‍♀️",
			"CONTINUOUS":"♾",
			"TRANSPORT":"🚗",
			"MAKE_AWARE":"🛎",
			"RESOURCES":"🚰",
			"LED":"🚥",
			"ENVIRONMENT":"🌍",
			"SPORT":"⚽",
			"URBAN":"🏬",
			"SOCIAL":"💬",
			"SAFETY":"🧯",
			"LOW":"⏳",
			"MEDIUM":"⌚️",
			"HIGH":"📱",
			"ASSISTED_LIVING":"👵🏼",
			"ROBOT":"🤖",
			"ARTIFICIAL":"👽",
			"FAMILIAR":"🧸",
			"AIRMOVE":"🌪",
			"ASSOCIATED":"🌂",
			"SHOPPING":"🛒",
			"OTHER":"❓",
			"NA":"❌",
			"INCREASE_AWARENESS":"😇",
			"AID_IN_ACTIVITY":"🔧",
			"PUBLIC":"🚏",
			"PROJECTION":"📽",
			"SCREEN":"📺",

			"IN_SITU":"💉",
			"IN_LAB":"🧫",
			"IN_PRESENTATION":"📈",

			"WOZ":" 🎎",

			"USERS":"👶",
			"EXPERTS":"👩‍🎓",

			"NO":"❌",
			"YES":"✅",

			"HOURS":"⏱",
			"WEEKS":"📅",
			"MONTHS":"🎄"

		};

		let dims = columns.filter(col => {
			if ([
			"META.SCOPE",
			"META.GOAL",
			"META.TOPIC",
			"META.SETTING",
			"OUTPUT.MODALITY",
			"OUTPUT.SIMILARITY",
			"OUTPUT.TECH",
			"OUTPUT.ACCESS",
			"EVAL.HAS_EVALUATION",
			"EVAL.SAMPLE_SIZE",
			"EVAL.TIME_PERIOD",
			"EVAL.SETTING",
			"EVAL.STUDY_GROUP"].includes(col.data)) return true;
		});


		let processMultiValues = function(rowsData,counter = 0) {
			console.log("processMultiValues",counter);
			let multiValues = false;
			let newRowsData = {};

			Object.entries(rowsData).forEach(([idx,rowDatas]) => {
				rowDatas.forEach(rowData => {
					let r = {idx,dbId:rowData.dbId};
					let rowHasMultiValues = false;
					dims.forEach(col => {
						let name = col.data;

						let values = rowData[name] || "";

						values = values.trim();

						if (!rowHasMultiValues && values && values.indexOf(",") > -1) {
							rowHasMultiValues = true;
							let sameIdxs = rowsData[idx];
							sameIdxs.forEach(sameIdx => {
								values.trim().split(",").filter(x => !!x).forEach((value,i) => {
									let clone = _.clone(sameIdx);
									value = value.trim();
									clone[name] = values[value] || value;
									newRowsData[idx] = newRowsData[idx] || [];
									newRowsData[idx].push(clone);
								});
							});
						} else {
							r[name] = ValueToIcon[values] || values;
						}
					});
					if (!rowHasMultiValues) {
						newRowsData[idx] = newRowsData[idx] || [];
						newRowsData[idx].push(r);
					}
					multiValues = multiValues || rowHasMultiValues;
				});
			});

			if (multiValues && counter < 1000) {
				return processMultiValues(newRowsData,counter+1);
			} else {
				if (counter >= 1000) {
					console.log("Stopped too many loops")
				}
				return newRowsData;
			}
		}

		//

		rowsData = rowsData.map(rowData => {
			let r = {idx:rowData.idx,dbId:rowData.DB.ID};
			dims.forEach(col => {
				let name = col.data;
				let [mainField,subField] = name.split(".");
				let values = rowData[mainField][subField];
				if (values === undefined) {
					console.log(name,mainField,subField,rowData[mainField]);
					//debugger;
				}
				r[name] = values;
			});
			return r;
		});

		rowsData = processMultiValues(rowsData.reduce((acc,cur) => {acc[cur.idx] = [cur]; return acc;},{}));

		let allRowData = _.flatten(Object.values(rowsData));
		visualContainer.empty();
		if (allRowData.length) {


			let dimensions = {};
			let hideAxes = ["idx","dbId","META.Name","alpha"];

			dims.forEach(col => {
				let allUniqData = _.uniq(allRowData.map(d => d[col.data])).sort();
				if (allUniqData.length == 0 || (allUniqData.length == 1 && allUniqData[0] == "")) {
					hideAxes.push(col.data);
					return;
				}

				let tickValues;
				if (col.editable) {
					if (_.isArray(col.editable)) {
						tickValues = col.editable;
					} else {
						if (_.isObject(col.editable)) {
							tickValues = Object.keys(col.editable)
						}
					}

					if (tickValues) {
						tickValues = tickValues.map(tv => ValueToIcon[tv] || tv);
					}
				}

				if (!tickValues) {
					tickValues = allUniqData.sort((a,b) => {
						let aInt = parseInt(a).toString() == a;
						let bInt = parseInt(b).toString() == b;
						if (aInt && bInt) {
							return parseInt(a) - parseInt(b);
						}
						return a.localeCompare(b);
					});
				}

				tickValues = tickValues.filter(v => allUniqData.includes(v));



				dimensions[col.data] = {
					title: toCamelCase(col.data.split(".")[1].replace(/_/g," ")),
					tickValues
				}
				//console.log(col,col.data,allUniqData,tickValues);
			});
			//console.log(dimensions);

			let hashes = {};
			allRowData = allRowData.filter(x => {
				let hash = JSON.stringify(x);
				if (hashes[hash]) return;
				hashes[hash] = true;
				return true;
			});

			allRowData.forEach(d => {
				d.alpha = 1/(rowsData[d.idx].length);
			});

			window.parplot = ParCoords({
				nullValueSeparator: "bottom"
			})("#parCoords");

					window.parplot.data(_.shuffle(allRowData))
					.alpha(1/Math.log(Math.max(10,allRowData.length)))
					.dimensions(dimensions)
					.hideAxis(hideAxes)
					.bundlingStrength(0.5)
					/*
					.color(d => {
						//console.log(d);
						return "rgba(50,75,180,"+0.001+")"
					})
					*/
					.smoothness(0.2)
					.margin({
						top: 32,
						left: 50,
						right: 50,
						bottom: -32
					  })
					.mode("queue")
					.render()
					.reorderable()
					.shadows()
					.brushMode("1D-axes-multi")
					.color("#0000ff")
					.on('brushend',(brushed,args) => {
						let dbIds = _.uniq(brushed.map(b => b.dbId));
						//console.log("brushend",dbIds,brushed,args);
						if (dbIds.length == 0) {
							//no rows left over, search for something that is not inside
							dbIds = ["THISISNOTADATABASEID"];
						}
						table.columns(0).search(dbIds.join("|"),true,false).draw();
					})
		}
	};

	updateVisuals();
	window.addEventListener("updateVisuals",updateVisuals);

	let onResize = _.debounce(() => {
		if (window.parplot) {
			(function() {
				return;
				this.resize();
				this.autoscale();
				this.removeAxes();
				this.createAxes();
				this.render();
				/*
				this.updateAxes();
				this.render();
				*/
			}).bind(window.parplot)();
		}
	},300);

	$(window).on("resize",onResize);
};