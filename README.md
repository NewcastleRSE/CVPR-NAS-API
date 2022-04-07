# CVPR-NAS

## About

CVPR-NAS is an annual competition that compares how well Neural Search Architectures can apply machine learning methods to unseen datasets. Competitors must register with a website so that they can download a starting kit and datasets, then use these resources to complete their NAS algorithm.

Their code based entry is then uploaded to the same website which must then allocate resources and run their submitted code. This code run is time limited to one hour. There will only be a limited number of GPUs available to run the code, so jobs may be queued and executed in the order received.

Between 5-10 submissions are expected per day during the allowed submission period. Competitors will ideally have email notification of their code status. It is expected that code will be uploaded in a zip format.


### Project Team
Stephen McGough - ([stephen.mcgough@newcastle.ac.uk](mailto:stephen.mcgough@newcastle.ac.uk))
Rob Geada - ([rob@geada.net](mailto:rob@geada.net))
David Towers - ([d.towers2@newcastle.ac.uk](mailto:d.towers2@newcastle.ac.uk))
Nik Khadijah Nik Aznan  - ([nik.nik-aznan@newcastle.ac.uk](mailto:nik.nik-aznan@newcastle.ac.uk))
Amir Atapour-Abarghouei - ([amir.atapour-abarghouei@durham.ac.uk](mailto:amir.atapour-abarghouei@durham.ac.uk))


### RSE Contact
Rebecca Osselton
Newcastle University  
([rebecca.osselton@newcastle.ac.uk](rebecca.osselton@newcastle.ac.uk))  

## Built With

[Strapi](https://docs.strapi.io/)  
[Vue](https://vuejs.org/)  


## Getting Started

This is a back-end application that connects to a front-end created uisng Vue.js. [CVPR-NAS-VUE](https://github.com/NewcastleRSE/CVPR-NAS-VUE).
Strapi provides Browser based admin access using a registered username and password. 

The competition has 3 stages. Users are able to upload zip files which are received by the Strapi back-end and recorded. Files are then passed to an Azure batch service with a unique id and run using specific datasets. Once the submissions have been executed via the batch pool, results are returned to the back-end and stored against the orignal submission. The website is able to query the back-end for each submission results and display a ranking of competitors based on runtimes and scores.


### Prerequisites

Node.js, yarn

### Installation

Clone the repo into a suitable directory. Create an .env file containing the following variables:

`JWT_SECRET
API_TOKEN_SALT
STORAGE_ACCOUNT_NAME
STORAGE_ACCOUNT_KEY
STORAGE_CONTAINER_NAME
BATCH_ACCOUNT_NAME
BATCH_ACCOUNT_KEY
BATCH_ENDPOINT
SLACK_WEBHOOK
`

### Running Locally

`yarn start` to start the Strapi admin application.

## Deployment

`yarn build` to build the application ready for deployment. 

## Branches

Main and dev only


