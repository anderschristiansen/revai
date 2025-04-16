# RevAI Tests

This directory contains various test suites for the RevAI project components.

## Test Suites

- **Article Parser**: Tests for the parser that extracts data from different article file formats (Embase, Web of Science, PubMed)

## Running Tests

### All Tests

To run all tests:

```bash
./run-all-tests.sh
```

### Individual Test Suites

To run a specific test suite:

```bash
cd article-parser
./run-test.sh
```

## Adding New Tests

When adding new test suites, please follow this structure:

1. Create a new directory for your test suite (e.g., `my-component-tests`)
2. Create a standalone package.json in that directory with necessary dependencies
3. Create a `run-test.sh` script for running just that test suite
4. Add documentation in a README.md file within your test directory
5. Update the main `run-all-tests.sh` script to include your new test suite 