#!/bin/sh

DATE=$(date "+%Y-%m-%d")
DATETIME="$DATE $(date "+%T")"
SAS_URL="$SAS_PATH/data.db$SAS_TOKEN"

azcopy cp /usr/local/src/sqlite/data.db $SAS_URL
echo "$DATETIME Persisted data"