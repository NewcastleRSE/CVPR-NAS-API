#!/bin/bash
# Copy environment variables to backup scripts for access via cron
sed -i "3 i SAS_TOKEN=\"$SAS_TOKEN\"" /usr/local/src/sqlite/persist.sh
sed -i "3 i SAS_PATH=\"$SAS_PATH\"" /usr/local/src/sqlite/persist.sh
sed -i "3 i SAS_TOKEN=\"$SAS_TOKEN\"" /usr/local/src/sqlite/dailyBackup.sh
sed -i "3 i SAS_PATH=\"$SAS_PATH\"" /usr/local/src/sqlite/dailyBackup.sh
# Get environment variables to show up in SSH session
eval $(printenv | sed -n "s/^\([^=]\+\)=\(.*\)$/export \1=\2/p" | sed 's/"/\\\"/g' | sed '/=/s//="/' | sed 's/$/"/' >> /etc/profile)
# Start SSHD Process
sed -i "s/SSH_PORT/$SSH_PORT/g" /etc/ssh/sshd_config
/usr/sbin/sshd
## Copy latest database
SAS_URL="$SAS_PATH/data.db$SAS_TOKEN"
azcopy cp $SAS_URL /usr/local/src/sqlite/data.db
## Start Cron and App
service cron start && yarn dev