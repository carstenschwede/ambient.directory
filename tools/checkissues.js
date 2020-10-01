require('dotenv').config();
const { Octokit } = require("@octokit/rest");
const octokit = new Octokit({
  auth: process.env.GITHUBPAT
});
const { Base64 } = require("js-base64")

const tabletojson = require('tabletojson').Tabletojson;

// Compare: https://docs.github.com/en/rest/reference/repos/#list-organization-repositories

let {owner,repo,committer,author} = {
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

const Digest = require("digest");

let getSHAofFile = (file) => {
  var crypto = require('crypto')
  var shasum = crypto.createHash('sha1')
  shasum.update('blob ' + Buffer.byteLength(file) + "\0" + fs.readFileSync(file,{encoding:'utf8'}).toString());
  shasum.digest('hex')
  return shasum;
}

const papa = require("papaparse");

let {parseCSV,exportCSV} = require("./public/CSVHandling.js");

let getIssues = async () => {
  let response = await octokit.issues.listForRepo({owner,repo});
  return response.data;
}


const fs = require("fs");

(async() => {
  let csvFile = "./db/csv/ambientdirectory.csv";

  let csv = fs.readFileSync(csvFile).toString();

  let csvRows = await parseCSV(csv,papa);
  let db = {};
  csvRows.forEach(row => {
    db[row.DB.ID] = row;
  });

  let result = await getIssues();
  let changedRequests = [];

  result.filter(issue => {
    return issue.state == "open" && !issue.pull_request;
  }).map(issue => {
    try {
      return tabletojson.convert(issue.body)[0];
    } catch(e) {
    }
  }).filter(x => !!x).forEach(changeRequestsInIssue => {
    let groupedByCitationKey = {};

    changeRequestsInIssue.forEach(cr => {
      let currentData = db[cr.dbId];
      if(!currentData) return console.error("Unknown dbId",cr.dbId);
      if(!currentData && currentData.DB.REVISION > cr.Revision) {
        return console.warn("Ignoring Change Request, data has already been updated to newer revision");
      }

      groupedByCitationKey[cr.CitationKey] = groupedByCitationKey[cr.CitationKey] || [];
      groupedByCitationKey[cr.CitationKey].push(cr);
    });

    //For each CitationKey create new pull request
    Object.entries(groupedByCitationKey).forEach(([citationKey,updates]) => {
      let newCSVRows = JSON.parse(JSON.stringify(csvRows));
      updates.forEach(cr => {
        let entry = newCSVRows.filter(row => row.DB.ID == cr.dbId)[0];
        if (!entry) {
          return console.warn(cr.dbId,"not found");
        }
        let [mainField,subField] = cr.Field.split(".");
        entry[mainField][subField] = cr.New;
        entry.DB.REVISION++;
        console.log(entry);
      });
      let newCSV = exportCSV(newCSVRows,papa);
      fs.writeFileSync("amiPR.csv",newCSV);

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
