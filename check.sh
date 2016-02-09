#!/bin/bash
ps -ef | grep -v grep | grep -q 'node ./httpd.js' || node ./httpd.js 2>&1 >>./https.log &
ps -ef | grep -v grep | grep -q 'node ./index.js' || node ./index.js 2>&1 >>./bot.log &
