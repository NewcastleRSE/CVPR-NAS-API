FROM node:14

# Define input arguments
ARG JWT_SECRET
ARG API_TOKEN_SALT
ARG STORAGE_ACCOUNT_NAME
ARG STORAGE_ACCOUNT_KEY
ARG STORAGE_CONTAINER_NAME
ARG BATCH_ACCOUNT_NAME
ARG BATCH_ACCOUNT_KEY
ARG BATCH_ENDPOINT
ARG DATABASE_FILENAME
ARG SAS_PATH
ARG SAS_TOKEN

# Set SAS properties as ENV variables
ENV SAS_PATH=SAS_PATH
ENV SAS_TOKEN=SAS_TOKEN

# Create directory for source code and set as working directory
RUN mkdir -p /usr/local/src
WORKDIR /usr/local/src

# Install OpenSSH
RUN apt-get update && apt-get -y install openssh-server && echo "root:Docker!" | chpasswd 

# Copy the sshd_config file to the /etc/ssh/ directory
COPY ssh-setup/sshd_config /etc/ssh/

# Copy and configure the ssh_setup file
RUN mkdir -p /tmp
COPY ssh-setup/ssh_setup.sh /tmp
RUN chmod +x /tmp/ssh_setup.sh && (sleep 1;/tmp/ssh_setup.sh 2>&1 > /dev/null)

# Download AzCopy
RUN wget https://aka.ms/downloadazcopy-v10-linux
 
# Expand Archive
RUN tar -xvf downloadazcopy-v10-linux
 
# Move AzCopy to the destination you want to store it
RUN mv ./azcopy_linux_amd64_*/azcopy /usr/bin/

# Install Cron
RUN apt-get update && apt-get -y install cron

# Copy backup-cron files to the cron.d directory
COPY sqlite/backup.cron /etc/cron.d/backup.cron
 
# Give execution rights on the cron job
RUN chmod 0644 /etc/cron.d/backup.cron

# Apply cron job
RUN crontab /etc/cron.d/backup.cron
 
# Create the log file to be able to run tail
RUN touch /var/log/persist.log
RUN touch /var/log/backup.log

# Copy source code to image
COPY config ./config
COPY src ./src
COPY public/robots.txt ./public/robots.txt
COPY sqlite/persist.sh ./sqlite/persist.sh
COPY sqlite/dailyBackup.sh ./sqlite/dailyBackup.sh
COPY package.json ./
COPY favicon.ico ./

# Install from source
RUN yarn install

# Build app in production mode
RUN NODE_ENV=production yarn build

EXPOSE 8080 2222

COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh
RUN chmod +x sqlite/dailyBackup.sh

# Start app when container starts
ENTRYPOINT [ "bash", "entrypoint.sh"]