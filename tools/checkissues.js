require('dotenv').config();
const {
	Octokit
} = require("@octokit/rest");
const octokit = new Octokit({
	auth: process.env.GITHUBPAT
});

const tabletojson = require('tabletojson').Tabletojson;


const bibtexParse = require("../db/bibtex/bibtexparse");

// Compare: https://docs.github.com/en/rest/reference/repos/#list-organization-repositories

let {
	owner,
	repo,
	committer,
	author
} = {
	owner: "carstenschwede",
	repo: "ambient.directory",
	committer: {
		name: "Carsten Schwede",
		email: ["cschw","ede@","techf","ak.uni-bie","lefeld.de"].join("")
	},
	author: {
		name: "Carsten Schwede",
		email: ["cschw","ede@","techf","ak.uni-bie","lefeld.de"].join("")
	}
};


let getSHAofFile = (file) => {
	var crypto = require('crypto')
	var shasum = crypto.createHash('sha1')
	shasum.update('blob ' + Buffer.byteLength(file) + "\0" + fs.readFileSync(file, {
		encoding: 'utf8'
	}).toString());
	shasum.digest('hex')
	return shasum;
}

const papa = require("papaparse");

let {
	parseCSV,
	exportCSV
} = require("../db/csv/CSVHandling.js");

let getIssues = async () => {
	let response = await octokit.issues.listForRepo({
		owner,
		repo
	});
	return response.data;
}


const fs = require("fs");
const cheerio = require("cheerio");

(async () => {
	let csvFile = "./db/csv/ambientdirectory.csv";

	let csv = fs.readFileSync(csvFile).toString();

	let csvRows = await parseCSV(csv, papa);
	let db = {};
	csvRows.forEach(row => {
		db[row.DB.ID] = row;
	});

	let result = await getIssues();
	let changedRequests = [];


	let bibById = {};
	let bibFile = "./db/bibtex/ambientdirectory.bib";
	bibtexParse.toJSON(fs.readFileSync(bibFile).toString()).forEach(entry => {
		bibById[entry.citationKey] = entry;
	});

	let groupedByCitationKey = {};

	let openIssues = 	result.filter(issue => {
		return issue.state == "open" && !issue.pull_request;
	});

	let approvedOpen = openIssues.filter(issue => {
		let labels = issue.labels.map(label => label.name);
		return labels.includes("approved");
	});

	console.log("Total of",openIssues.length,"open issues found.");
	console.log("Total of",approvedOpen.length,"pending issues found that are ready to be merged.");

	approvedOpen.map(issue => {
		let $ = cheerio.load(issue.body);

		$('code').toArray().map(code => {
			let bibtex = $(code).text().trim();
			let json = bibtexParse.toJSON(bibtex)[0];
			if (json) {
				if (bibById[json.citationKey]) {
					console.warn(json.citationKey,"is already known, ignored");
				} else {
					bibById[json.citationKey] = json;
				}
			}
		});

		const _ = require("lodash")
		let changeRequests = _.flatten($('table').toArray().map(table => {
			let tableHtml = $(table).html();
			let json = tabletojson.convert("<table>" + tableHtml + "</table>")[0];
			return json;
		})).filter(x => !!x);


		changeRequests.filter(cr => cr.Field == "DB.ID").forEach(cr => {
			let dbId = cr.New;
			let entry = {DB:{ID:dbId,REVISION:0},PUB:{CitationKey:cr.CitationKey,},META:{},MAPPING:{},OUTPUT:{},EVAL:{}};
			db[dbId] = entry;
			csvRows.push(entry);
		});

		changeRequests.forEach(cr => {
			let currentData = db[cr.dbId];
			if (!currentData) return console.error("Unknown dbId", cr.dbId);
			if (!currentData && currentData.DB.REVISION > cr.Revision) {
				return console.warn("Ignoring Change Request, data has already been updated to newer revision");
			}

			groupedByCitationKey[cr.CitationKey] = groupedByCitationKey[cr.CitationKey] || [];
			groupedByCitationKey[cr.CitationKey].push(cr);
		});
	});



		//For each CitationKey create new pull request
		let newCSVRows = JSON.parse(JSON.stringify(csvRows));

		Object.entries(groupedByCitationKey).forEach(([citationKey, updates]) => {
			updates.forEach(cr => {
				let entry = newCSVRows.filter(row => row.DB.ID == cr.dbId)[0];
				if (!entry) {
					return console.warn(cr.dbId, "not found");
				}
				let [mainField, subField] = cr.Field.split(".");
				entry[mainField][subField] = cr.New;
				entry.DB.REVISION++;
				console.log("Updated",entry.PUB.CitationKey,entry.DB.ID);
			});
		});

		let newCSV = exportCSV(newCSVRows, papa);
		fs.writeFileSync(csvFile,newCSV);
		//console.log(newCSV);

		let newBibTex = bibtexParse.toBibtex(Object.values(bibById),false);
		fs.writeFileSync(bibFile,newBibTex);



})();




			/*
			return;

			octokit.repos.createOrUpdateFileContents({
				owner,
				repo,
				path: "public/ami.csv",
				message: "Updated CSV database",
				content: Base64.encode(newCSV),
				sha: getSHAofFile(csvFile),
				"committer.name": committer.name,
				"committer.email": committer.email,
				"author.name": author.name,
				"author.email": author.email
			});
			*/
