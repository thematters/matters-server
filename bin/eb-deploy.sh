#!/bin/bash
TEMPLATE="docker/Dockerrun.aws.json.example"
OUT_CONFIG="Dockerrun.aws.json"

APP_DEVELOP="matters-stage"
ENV_DEVELOP="matters-server-develop"
REGION_DEVELOP="ap-southeast-1"
IMAGE_TAG_DEVELOP="develop"

APP_STAGING="matters-stage"
ENV_STAGING="matters-server-stage"
REGION_STAGING="ap-southeast-1"
IMAGE_TAG_STAGING="staging"

APP_PRODUCTION="matters-prod"
ENV_PRODUCTION="matters-server-prod"
REGION_PRODUCTION="ap-southeast-1"
IMAGE_TAG_PRODUCTION="prod"

TIMEOUT=30

if [[ $1 == 'develop' ]]
then
    echo "Deploying to development environment..."
    cat $TEMPLATE | sed "s/{{IMAGE_TAG}}/$IMAGE_TAG_DEVELOP/" > $OUT_CONFIG
    printf '\n\n' | eb init $APP_DEVELOP --region $REGION_DEVELOP
    eb deploy $ENV_DEVELOP --timeout $TIMEOUT
elif [[ $1 == 'staging' ]]
then
    echo "Deploying to staging environment..."
    cat $TEMPLATE | sed "s/{{IMAGE_TAG}}/$IMAGE_TAG_STAGING/" > $OUT_CONFIG
    printf '\n\n' | eb init $APP_STAGING --region $REGION_STAGING
    eb deploy $ENV_STAGING --timeout $TIMEOUT
elif [[ $1 == 'prod' ]]
then
    echo "Deploying to production environment..."
    cat $TEMPLATE | sed "s/{{IMAGE_TAG}}/$IMAGE_TAG_PRODUCTION/" > $OUT_CONFIG
    printf '\n\n' | eb init $APP_PRODUCTION --region $REGION_PRODUCTION
    eb deploy $ENV_PRODUCTION --timeout $TIMEOUT
else
    echo "Usage: bin/eb-deploy.sh [develop|staging|prod]"
fi

