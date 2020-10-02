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
		filter:true,
		render: {
			width: 200
		}
	},

	"BIBTEX.title": {
		searchable:true,
		filter:"*",
		render: {
			width: 300
		}
	},
	"BIBTEX.author": {
		searchable:true,
		filter: {
			transform: function(data) {
				return data.split(" and ").filter(x => !!x && x != "");
			}
		},
		render: {
			transform: function(data,type) {
				if (!data) return "";
				if (type !== "display") return data;

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
		searchable:true,
		filter:true,
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
		filter:"*",
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
		filter:"*",
		editable: true,
		render: {
			width: 200
		}
	},

	"META.SCOPE": {
		description: "",
		searchable:true,
		filter:true,
		editable: multiple({
			"AMI":"Ambient Intelligence",
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
	},"META.FOCUS": {
		description: "",
		searchable:true,
		filter:true,
		editable: multiple({
			"DEFTAX": "Taxonomy",
			"PROTO": "Protoyping",
			"EVAL":"Evaluation",
			"ISSUES":"Issues",
			"CONCEPT":"Concept",
			"USECASE":"Use Case",
			"DEVICE":"Device",
			"OTHER":"Other"
		}),
		render: {
			width: 200
		}
	},
	"META.GOAL": {
		description: "",
		searchable:true,
		filter:true,
		editable: multiple(["BEHAVIOURAL_CHANGE","INCREASE_AWARENESS","NOTIFICATION","ASSISTED_LIVING","AID_IN_ACTIVITY","UNSTATED","OTHER"]),
		render: {
			width: "auto"
		}
	},
	"META.TOPIC": {
		description: "",
		searchable:true,
		filter:true,
		editable: multiple(["HEALTH","ENVIRONMENT","RESOURCES","EVENTS","SOCIAL","OTHER"]),
		render: {
			width: "auto"
		}
	},
	"META.SETTING": {
		description: "",
		searchable:true,
		filter:true,
		editable: multiple(["HOME","EDUCATION","WORKPLACE","TRANSPORT","MEDICAL","SOCIAL","OTHER"]),
		render: {
			width: "auto"
		}
	},
	"MAPPING.HAS_MAPPING": {
		description: "",
		filter:true,
		editable: ["YES","NO","?"],
		render: {
			width: "auto"
		}
	},
	"MAPPING.FROM": {
		description: "",
		filter:true,
		editable: true,
		render: {
			width: 200
		}
	},
	"MAPPING.ORIGIN": {
		description: "",
		filter:true,
		editable: ["LOCAL","NEAR","REMOTE","VIRTUAL","?"],
		render: {
			width: 100
		}
	},
	"MAPPING.TO": {
		description: "",
		filter:true,
		editable: true,
		render: {
			width: 200
		}
	},

	"MAPPING.CONCEPT": {
		description: "",
		filter:true,
		editable: true,
		render: {
			width: "auto"
		}
	},
	"MAPPING.REPRESENTATION": {
		description: "",
		filter:true,
		editable: true,
		render: {
			width: "auto"
		}
	},
	"MAPPING.MEANING": {
		description: "",
		filter:true,
		editable: true,
		render: {
			width: "auto"
		}
	},


	"MAPPING.LEVEL": {
		description: "",
		filter:true,
		editable: ["ICONIC","INDEXICAL","SYMBOLIC","?"],
		render: {
			width: 100
		}
	},
	"OUTPUT.ACTIVATION": {
		editable: ["CONTINUOUS","EVENTBASED","OBJECTBASED","USERBASED","?"],
		filter:true,
		render: {
			width: 125
		}
	},
	"OUTPUT.TRANSITION_TO_FOREGROUND": {
		description: "",
		filter:true,
		editable: ["CHANGE_BLIND","MAKE_AWARE","INTERRUPT","DEMAND_ATTENTION","USER_POLL","?"],
		render: {
			width: 125
		}
	},
	"OUTPUT.MEDIUM": {
		description: "",
		filter:true,
		editable: ["AMBIENCE","ASSOCIATED_OBJECT","KNOWN_OBJECT","ARTIFICIAL_OBJECT","?"],
		render: {
			width: 125
		}
	},
	"OUTPUT.MODALITY": {
		description: "",
		searchable: true,
		filter:true,
		editable: multiple(["AUDIO","VISUAL","HAPTIC","TASTE","SMELL","PAIN","EQUILIBRIO"]),
		render: {
			width: 125
		}
	},
	"OUTPUT.LOCALIZATION": {
		description: "",
		filter:true,
		editable: ["AMBIENCE","DIRECTIONAL","ROUGHLY","EXACT","?"],
		render: {
			width: 125
		}
	},
	"OUTPUT.ACCESS": {
		description: "",
		filter:true,
		editable: ["PERSONAL","PARTNERSHIP","FAMILY","GROUP","PUBLIC","?"],
		render: {
			width: 125
		}
	},
	"OUTPUT.INFORMATION_BANDWIDTH": {
		description: "",
		filter:true,
		editable: ["LOW","MEDIUM","HIGH","?"],
		render: {
			width: 100
		}
	},
	"EVAL.SAMPLE_SIZE": {
		description: "",
		filter:true,
		editable: true,
		render: {
			width: "auto"
		}
	},
	"EVAL.TIME_PERIOD": {
		description: "",
		filter:true,
		editable: ["HOURS","WEEKS","MONTHS","?"],
		render: {
			width: 100
		}
	},
	"EVAL.SETTING": {
		description: "",
		filter:true,
		editable: ["IN_SITU","IN_LAB","IN_PRESENTATION","?"],
		render: {
			width: 125
		}
	},
	"EVAL.STUDY_GROUP": {
		description: "",
		filter:true,
		editable: ["USERS","EXPERTS","?"],
		render: {
			width: 100
		}
	},
	"EVAL.DEVSTAGE": {
		description: "",
		filter:true,
		editable: ["PRESENTATION","WOZ","REDUCED_PROTOTYPE","PROTOTYPE","FINAL","?"],
		render: {
			width: 200
		}
	},
	"EVAL.USABILITY": {
		description: "",
		filter:true,
		editable: multiple(["QUESTIONNAIRE","INTERVIEW","COMMENTS","OBSERVATION","HEURISTIC_EVALUATION","USAGE_STATISTIC","TASK_PERFORMANCE","[NA]"]),
		render: {
			width: 200
		}
	},
	"EVAL.COGNITIVE_LOAD": {
		description: "",
		filter:true,
		editable: multiple(["QUESTIONNAIRE","DUAL_TASK","TASK_SHEDDING","PHYSIOLOGICAL (EYE)","PHYSIOLOGICAL (BRAIN)","PHYSIOLOGICAL (HEART)","PHYSIOLOGICAL (RESP)","PHYSIOLOGICAL (SKIN)","[NA]"]),
		render: {
			width: 200
		}
	},
	"EVAL.CHANGED_BEHAVIOUR": {
		description: "",
		filter:true,
		editable: multiple(["SUBJECTIVE","OBJECTIVE","[NA]"]),
		render: {
			width: "auto"
		}
	}
	};