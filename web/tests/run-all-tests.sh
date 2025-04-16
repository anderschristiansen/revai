#!/bin/bash
# Navigate to the tests directory
cd "$(dirname "$0")"

# Run article parser tests
echo "Running Article Parser Tests..."
echo "=============================="
cd article-parser && ./run-test.sh

# Add any other test suites here in the future
# echo -e "\nRunning Other Tests..."
# echo "=============================="
# cd ../other-test-module && ./run-test.sh

echo -e "\nAll tests completed!" 