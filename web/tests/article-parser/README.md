# Article Parser Tests

This folder contains tests for the article parser module which is responsible for extracting article data from various file formats:

- Embase
- Web of Science
- PubMed

## Setup

Before running the tests, make sure to install the dependencies:

```bash
npm install
```

## Running Tests

You can run the tests with:

```bash
npm test
```

Or use the convenience script:

```bash
./run-test.sh
```

## Test Files

The tests use sample files from the `web/resources/min/` directory:

- `embase-min.txt`: Sample data in Embase format
- `webofsciences_1_min.txt`: Sample data in Web of Science format
- `pubmed-min.txt`: Sample data in PubMed format

## What's Being Tested?

The tests verify that the parser can:

1. Detect file formats automatically
2. Extract titles and abstracts correctly from each format
3. Handle multi-line titles and abstracts
4. Process all articles in a file

Each test displays the number of articles found and a preview of the first article's title and abstract. 