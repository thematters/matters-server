#!/usr/bin/env bash

# https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/platforms-linux-extend.html

echo ".platform/confighooks/postdeploy/map_parameters_to_env_vars.sh executing"
echo "Running script to fetch parameter store values and add them to /opt/elasticbeanstalk/deployment/env file."

# We need to check the Elastic Beanstalk environment properties to find out
# what the path is to use for the parameter store values to fetch.
# Only the parameters under that path will be fetched, allowing each Beanstalk
# config to specify a different path if desired.
readarray eb_env_vars < /opt/elasticbeanstalk/deployment/env

for i in ${eb_env_vars[@]}
do
  if [[ $i == *"ENV_STORE_PATH"* ]]; then
    ENV_STORE_PATH=$(echo $i | grep -Po "([^\=]*$)")
  fi
done

if [ -z ${ENV_STORE_PATH+x} ]; then
  echo "Error: ENV_STORE_PATH is unset on the Elastic Beanstalk environment properties.";
  echo "You must add a property named ENV_STORE_PATH with the path prefix to your SSM parameters.";
else
  echo "Success: ENV_STORE_PATH is set to '$ENV_STORE_PATH'";

  TOKEN=`curl -X PUT http://169.254.169.254/latest/api/token -H "X-aws-ec2-metadata-token-ttl-seconds:21600"`
  AWS_DEFAULT_REGION=`curl -H "X-aws-ec2-metadata-token:$TOKEN" -v http://169.254.169.254/latest/meta-data/placement/region`

  export AWS_DEFAULT_REGION

  # Create a copy of the environment variable file.
  cp /opt/elasticbeanstalk/deployment/env /opt/elasticbeanstalk/deployment/custom_env_var

  # Add values to the custom file
  echo "AWS_DEFAULT_REGION=$AWS_DEFAULT_REGION" >> /opt/elasticbeanstalk/deployment/custom_env_var

  jq_actions=$(echo -e ".Parameters | .[] | [.Name, .Value] | \042\(.[0])=\(.[1])\042 | sub(\042${ENV_STORE_PATH}\042; \042\042)")

  aws ssm get-parameters-by-path \
  --path $ENV_STORE_PATH \
  --with-decryption \
  --region us-east-1 \
  | jq -r "$jq_actions" >> /opt/elasticbeanstalk/deployment/custom_env_var

  cp /opt/elasticbeanstalk/deployment/custom_env_var /opt/elasticbeanstalk/deployment/env

  # Remove temporary working file.
  rm -f /opt/elasticbeanstalk/deployment/custom_env_var

  # Remove duplicate files upon deployment.
  rm -f /opt/elasticbeanstalk/deployment/*.bak

fi
