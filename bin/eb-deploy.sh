#!/bin/bash
TEMPLATE="docker/Dockerrun.aws.json.example"
OUT_CONFIG="Dockerrun.aws.json"

APP_PRODUCTION="matters-prod"
ENV_PRODUCTION="matters-server-prod"
REGION_PRODUCTION="ap-southeast-1"
IMAGE_TAG_PRODUCTION="prod"

APP_STAGING="matters-stage"
ENV_STAGING="matters-server-stage"
REGION_STAGING="ap-southeast-1"
IMAGE_TAG_STAGING="staging"

if [[ $1 == 'prod' ]]
then
    echo "Deploying to production environment..."
    cat $TEMPLATE | sed "s/{{IMAGE_TAG}}/$IMAGE_TAG_PRODUCTION/" > $OUT_CONFIG
    printf '\n\n' | eb init $APP_PRODUCTION --region $REGION_PRODUCTION
    eb deploy $ENV_PRODUCTION
elif [[ $1 == 'staging' ]]
then
    echo "Deploying to staging environment..."
    cat $TEMPLATE | sed "s/{{IMAGE_TAG}}/$IMAGE_TAG_STAGING/" > $OUT_CONFIG
    printf '\n\n' | eb init $APP_STAGING --region $REGION_STAGING
    eb deploy $ENV_STAGING
else
    echo "Usage: bin/eb-deploy.sh [prod|staging]"
fi

