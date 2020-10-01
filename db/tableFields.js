let multiple = function(obj) {
	obj.$multiple = true;
	return obj;
};


let tableFields = {
	"DB.ID": {
		title: "",
		description: "",
		editable: false,
		sortable:false,
		searchable:true,
		render: {
			transform: (data) => {
				return "<span class='dbId' id='" + data + "'>"+data+"</span>";
			},
			width: 1
		}
	},

	"META.Name": {
		searchable:true,
		description: "",
		editable: true,
		render: {
			width: 200
		}
	},

	"BIBTEX.title": {
		searchable:true,
		render: {
			width: 300
		}
	},
	"BIBTEX.author": {
		searchable:true,
		render: {
			transform: function(data,type) {
				if (!data) return "";
				let authors = data.split(" and ").filter(x => !!x && x != "").map(author => {
					return author.split(", ").reverse().join(" ");
				}).map(author => {
					return "<li>" + author +  "</li>";
				}).join("\n");

				return "<ul class='author'>" + authors + "</ul>";


			},
			width: 200
		}
	},
	"BIBTEX.year": {
		render: {
			width: 300
		}
	},
/*
	"PUB.Title": {
		hide: true,
		description: "",
		editable: false,
		render: {
			width: "auto"
		}
	},
	"PUB.Author": {
		hide: true,
		description: "",
		editable: false,
		render: {
			width: "auto"
		}
	},
	"PUB.Year": {
		hide: true,
		description: "",
		editable: false,
		render: {
			width: "auto"
		}
	},
	"PUB.Link": {
		hide: true,
		description: "",
		editable: false,
		render: {
			width: "auto"
		}
	},
*/
	"BIBTEX.doi": {
		render: {
			transform: (data) => {
				if (!data) return "";
				return "<a class='external-link' href='https://doi.org/" + data + "' target='_blank'>"+data+"</a>";
			},
			width: "auto"
		}
	},
	"BIBTEX.url": {
		render: {
			transform: (data) => {
				if (!data) return "";
				return "<a class='external-link' href='" + data + "' target='_blank'></a>";
			},
			width: "auto"
		}
	},
	"PUB.Citations": {
		title: "Cites",
		description: "",
		editable: true,
		render: {
			width: "auto"
		}
	},
	"PUB.CitationsPerYear": {title:"Cites/Years"},
	"BIBTEX.abstract": {
		title:"Abstract",
		render: {
			transform: (data,b,entry) => {
				if (!data) return "";
				let shortAbstract =  data.length > 250 ? data.substr(0,250) + "..." : data;
				return shortAbstract + "<a class='external-link' href='#' onclick='showAbstract(\""+entry.DB.ID+"\");return false;'></a>";
			}
		}
	},

	"META.Description": {
		description: "",
		editable: true,
		render: {
			width: 200
		}
	},
	"META.SPECIFIC_NEW_USE_CASE": {
		title:"Use Case",
		description: "",
		editable: ["YES","NO","?"],
		render: {
			width: "auto"
		}
	},
	"META.FOCUS": {
		description: "",
		editable: multiple({
			"AmI":"Ambient Intelligence",
			"AD":"Ambient Display",
			"AIS":"Ambient Information System",
			"UI": "User Interface",
			"TUI":"Tangible User Interface",
			"IOT":"Internet-of-Things",
			"DEL":"Not Ambient (Delete)"
		}),
		render: {
			width: 200
		}
	},
	"META.GOAL": {
		description: "",
		editable: multiple(["BEHAVIOURAL_CHANGE","INCREASE_AWARENESS","NOTIFICATION","ASSISTED_LIVING","AID_IN_ACTIVITY","UNSTATED","OTHER"]),
		render: {
			width: "auto"
		}
	},
	"META.TOPIC": {
		description: "",
		editable: multiple(["HEALTH","ENVIRONMENT","RESOURCES","EVENTS","SOCIAL","OTHER"]),
		render: {
			width: "auto"
		}
	},
	"META.SETTING": {
		description: "",
		editable: multiple(["HOME","EDUCATION","WORKPLACE","TRANSPORT","MEDICAL","SOCIAL","OTHER"]),
		render: {
			width: "auto"
		}
	},
	"MAPPING.HAS_MAPPING": {
		description: "",
		editable: ["YES","NO","?"],
		render: {
			width: "auto"
		}
	},
	"MAPPING.FROM": {
		description: "",
		editable: true,
		render: {
			width: 200
		}
	},
	"MAPPING.ORIGIN": {
		description: "",
		editable: ["LOCAL","NEAR","REMOTE","VIRTUAL","?"],
		render: {
			width: 100
		}
	},
	"MAPPING.TO": {
		description: "",
		editable: true,
		render: {
			width: 200
		}
	},

	"MAPPING.CONCEPT": {
		description: "",
		editable: true,
		render: {
			width: "auto"
		}
	},
	"MAPPING.REPRESENTATION": {
		description: "",
		editable: true,
		render: {
			width: "auto"
		}
	},
	"MAPPING.MEANING": {
		description: "",
		editable: true,
		render: {
			width: "auto"
		}
	},


	"MAPPING.LEVEL": {
		description: "",
		editable: ["ICONIC","INDEXICAL","SYMBOLIC","?"],
		render: {
			width: 100
		}
	},
	"OUTPUT.ACTIVATION": {
		editable: ["CONTINUOUS","EVENTBASED","OBJECTBASED","USERBASED","?"],
		render: {
			width: 125
		}
	},
	"OUTPUT.TRANSITION_TO_FOREGROUND": {
		description: "",
		editable: ["CHANGE_BLIND","MAKE_AWARE","INTERRUPT","DEMAND_ATTENTION","USER_POLL","?"],
		render: {
			width: 125
		}
	},
	"OUTPUT.MEDIUM": {
		description: "",
		editable: ["AMBIENCE","ASSOCIATED_OBJECT","KNOWN_OBJECT","ARTIFICIAL_OBJECT","?"],
		render: {
			width: 125
		}
	},
	"OUTPUT.MODALITY": {
		description: "",
		editable: multiple(["AUDIO","VISUAL","HAPTIC","TASTE","SMELL","PAIN","EQUILIBRIO"]),
		render: {
			width: 125
		}
	},
	"OUTPUT.LOCALIZATION": {
		description: "",
		editable: ["AMBIENCE","DIRECTIONAL","ROUGHLY","EXACT","?"],
		render: {
			width: 125
		}
	},
	"OUTPUT.ACCESS": {
		description: "",
		editable: ["PERSONAL","PARTNERSHIP","FAMILY","GROUP","PUBLIC","?"],
		render: {
			width: 125
		}
	},
	"OUTPUT.INFORMATION_BANDWIDTH": {
		description: "",
		editable: ["LOW","MEDIUM","HIGH","?"],
		render: {
			width: 100
		}
	},
	"EVAL.SAMPLE_SIZE": {
		description: "",
		editable: true,
		render: {
			width: "auto"
		}
	},
	"EVAL.TIME_PERIOD": {
		description: "",
		editable: ["HOURS","WEEKS","MONTHS","?"],
		render: {
			width: 100
		}
	},
	"EVAL.SETTING": {
		description: "",
		editable: ["IN_SITU","IN_LAB","IN_PRESENTATION","?"],
		render: {
			width: 125
		}
	},
	"EVAL.STUDY_GROUP": {
		description: "",
		editable: ["USERS","EXPERTS","?"],
		render: {
			width: 100
		}
	},
	"EVAL.DEVSTAGE": {
		description: "",
		editable: ["PRESENTATION","WOZ","REDUCED_PROTOTYPE","PROTOTYPE","FINAL","?"],
		render: {
			width: 200
		}
	},
	"EVAL.USABILITY": {
		description: "",
		editable: multiple(["QUESTIONNAIRE","INTERVIEW","COMMENTS","OBSERVATION","HEURISTIC_EVALUATION","USAGE_STATISTIC","TASK_PERFORMANCE"]),
		render: {
			width: 200
		}
	},
	"EVAL.COGNITIVE_LOAD": {
		description: "",
		editable: multiple(["QUESTIONNAIRE","DUAL_TASK","TASK_SHEDDING","PHYSIOLOGICAL (EYE)","PHYSIOLOGICAL (BRAIN)","PHYSIOLOGICAL (HEART)","PHYSIOLOGICAL (RESP)","PHYSIOLOGICAL (SKIN)"]),
		render: {
			width: 200
		}
	},
	"EVAL.CHANGED_BEHAVIOUR": {
		description: "",
		editable: multiple(["SUBJECTIVE","OBJECTIVE"]),
		render: {
			width: "auto"
		}
	}
	};