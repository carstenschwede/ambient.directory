const papa = require("papaparse");
let {parseCSV,exportCSV} = require("../db/csv/CSVHandling.js");
const fs = require("fs");

const bibtexparse = require("../db/bibtex/bibtexparse.js");

(async() => {
	let bibFile = "./db/bibtex/bibtex.bib";
	let bib = bibtexparse.toJSON(fs.readFileSync(bibFile).toString());

  let csvFile = "./db/csv/ambientdirectory.csv";
  let csv = fs.readFileSync(csvFile).toString();

  let csvRows = await parseCSV(csv,papa);
  let db = {};
  csvRows.forEach(row => {
    db[row.PUB.CitationKey] = row;
  });

  bib = bib.filter(entry => db[entry.citationKey]);
  bib.forEach(entry => {
	  delete entry.file;
	  delete entry.notes;
  })

  let newBibFileContent = bibtexparse.toBibtex(bib,false);
  fs.writeFileSync("./db/bibtex/bibtex.bib",newBibFileContent)
})();