#!/bin/sh

DATE=$(date "+%Y-%m-%d")
DATETIME="$DATE $(date "+%T")"
SAS_URL="$SAS_PATH/data-$DATE.db$SAS_TOKEN"

echo "$DATETIME Creating local backup"
cp /usr/local/src/sqlite/data.db /usr/local/src/sqlite/data-$DATE.db 
echo "$DATETIME Copying local backup to Azure with URL $SAS_URL"
azcopy cp /usr/local/src/sqlite/data-$DATE.db $SAS_URL
echo "$DATETIME Removing local database as data-$DATE.db"
rm /usr/local/src/sqlite/data-$DATE.db