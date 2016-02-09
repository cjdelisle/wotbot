#!/bin/bash
ps -ef | grep -v grep | grep -q 'node ./httpd.js' || node ./httpd.js &
ps -ef | grep -v grep | grep -q 'node ./index.js' || node ./index.js &
