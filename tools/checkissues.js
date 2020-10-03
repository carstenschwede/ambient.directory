require('dotenv').config();
const {
	Octokit
} = require("@octokit/rest");
const octokit = new Octokit({
	auth: process.env.GITHUBPAT
});
const {
	Base64
} = require("js-base64")

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
		email: "cschwede@techfak.uni-bielefeld.de"
	},
	author: {
		name: "Carsten Schwede",
		email: "cschwede@techfak.uni-bielefeld.de"
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

	bibtexParse.toJSON(fs.readFileSync("./db/bibtex/bibtex.bib").toString()).forEach(entry => {
		bibById[entry.citationKey] = entry;
	});

	result.filter(issue => {
		return issue.state == "open" && !issue.pull_request;
	}).map(issue => {
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

		let newBibTex = bibtexParse.toBibtex(Object.values(bibById),false);
		const _ = require("lodash")
		let changeRequests = _.flatten($('table').toArray().map(table => {
			let tableHtml = $(table).html();
			let json = tabletojson.convert("<table>" + tableHtml + "</table>")[0];
			return json;
		})).filter(x => !!x);


		console.log(changeRequests);
		changeRequests.filter(cr => cr.Field == "DB.ID").forEach(cr => {
			let dbId = cr.New;
			let entry = {DB:{ID:dbId,REVISION:0},PUB:{CitationKey:cr.CitationKey,},META:{},MAPPING:{},OUTPUT:{},EVAL:{}};
			db[dbId] = entry;
			csvRows.push(entry);
		});

		let groupedByCitationKey = {};

		changeRequests.forEach(cr => {
			let currentData = db[cr.dbId];
			if (!currentData) return console.error("Unknown dbId", cr.dbId);
			if (!currentData && currentData.DB.REVISION > cr.Revision) {
				return console.warn("Ignoring Change Request, data has already been updated to newer revision");
			}

			groupedByCitationKey[cr.CitationKey] = groupedByCitationKey[cr.CitationKey] || [];
			groupedByCitationKey[cr.CitationKey].push(cr);
		});

		//For each CitationKey create new pull request
		Object.entries(groupedByCitationKey).forEach(([citationKey, updates]) => {
			let newCSVRows = JSON.parse(JSON.stringify(csvRows));
			console.log(updates);
			updates.forEach(cr => {
				let entry = newCSVRows.filter(row => row.DB.ID == cr.dbId)[0];
				if (!entry) {
					return console.warn(cr.dbId, "not found");
				}
				let [mainField, subField] = cr.Field.split(".");
				entry[mainField][subField] = cr.New;
				entry.DB.REVISION++;
				console.log(entry);
			});
			let newCSV = exportCSV(newCSVRows, papa);
			console.log(newCSV);
			//fs.writeFileSync("amiPR.csv",newCSV);

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

		});
	});
})();