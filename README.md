# ambient.directory - A collection of ambient, calm and 'unremarkable' technologies


## Abstract
Ambient technologies are often published using a variety of terms and keywords. Furthermore, the diversity of taxonomies and definitions about what constitutes ambient, calm or "unremarkable" technologies makes it difficult to find relevant research papers using conventional title or keyword search. In order to enable more comprehensive meta studies in the field of Ambient Intelligence and to easily identify already published work in the area, we provide the "ambient.directory" software and website. At the time of publication it provides access to >1,000 relevant concepts/ideas based on >800 publications ranging from demo prototypes of Ambient Displays to Taxonomies of Ambient Intelligence - including publication meta-data, abstracts, citation counts and classification metrics. Online editing, tagging, filtering and exporting features allow for convenient retrieval and collaborative maintenance of the directory.

*****

## Usage

The directory consists of a BibTeX file (`db/bib/ambientdirectory.bib`) describing the publication details and a CSV file (`db/csv/ambientdirectory.csv`) describing the meta data.
Both are linked using the BibTeX CitationKey.

The data in both files is aggregated using a web application accessible via http://ambient.directory.

*****

## Local installation
```sh
npm ci
npm start
# open http://localhost:8080
```

*****

## Collaboration

### BibTeX
You can add entries by dropping .bib-files or dragging entries from Zotero.

### Meta data
You can change meta data for most entries within the website on **ambient.directory**. If you'd like to make these changes accessible to the community, you can select "Publish Changes" which will open a corresponding issue in this repository.
Once your issue has been merged and closed, your changes will be visible to everybody visiting **ambient.directory**. Please use this feature responsibly.

If you'd like to add a new meta feature (or remove one), please open an issue for discussion.

*****

## Bugs
If you have found a bug, please open an issue.

*****

## Authors and Contributors
- Carsten Schwede, Ambient Intelligence Group, CITEC, Bielefeld University (author and maintainer)
- Thomas Hermann, Ambient Intelligence Group, CITEC, Bielefeld University (co-author)

## Citation

If you find this software or the dataset useful for your research, please consider citing the following:

```
@misc{schwedeAmbientDirectoryCollection2020,
	title        = {{http://ambient.directory - A collection of ambient, calm and 'unremarkable' technologies}},
	author       = {Schwede, Carsten and Hermann, Thomas},
	year         = {2020}
}
```
