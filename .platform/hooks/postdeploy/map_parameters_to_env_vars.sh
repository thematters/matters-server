#!/usr/bin/env bash

# https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/platforms-linux-extend.html

echo ".platform/hooks/postdeploy/map_parameters_to_env_vars.sh executing"
echo "Running script to fetch parameter store values and add them to <root>/.env file."

ENV_STORE_PATH=$(/opt/elasticbeanstalk/bin/get-config environment -k ENV_STORE_PATH)

if [ -z ${ENV_STORE_PATH+x} ]; then
  echo "Error: ENV_STORE_PATH is unset on the Elastic Beanstalk environment properties.";
  echo "You must add a property named ENV_STORE_PATH with the path prefix to your SSM parameters.";
else
  echo "Success: ENV_STORE_PATH is set to '$ENV_STORE_PATH'";

  # Create a copy of the environment variable file.
  ls -l .

  jq_actions=$(echo -e ".Parameters | .[] | [.Name, .Value] | \042\(.[0])=\(.[1])\042 | sub(\042${ENV_STORE_PATH}\042; \042\042)")

  aws ssm get-parameters-by-path \
  --path $ENV_STORE_PATH \
  --with-decryption \
  --region ap-southeast-1 \
  | jq -r "$jq_actions" >> .env

  wc -l .env

fi
