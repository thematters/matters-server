#!/usr/bin/env bash

# Safely fix invalid content-type metadata on AWS S3 bucket website assets for some common filetypes
# Inclues JPG, JPEG, GIF, PNG, SVG

BUCKET="matters-server-stage"


# Functions

function check_command {
	type -P $1 &>/dev/null || fail "Unable to find $1, please install it and run this script again."
}

function completed(){
	echo
	horizontalRule
	tput setaf 2; echo "Completed!" && tput sgr0
	horizontalRule
	echo
}

function fail(){
	tput setaf 1; echo "Failure: $*" && tput sgr0
	exit 1
}

function horizontalRule(){
	echo "====================================================="
}

function message(){
	echo
	horizontalRule
	echo "$*"
	horizontalRule
	echo
}

function pause(){
	read -n 1 -s -p "Press any key to continue..."
	echo
}


# Verify AWS CLI Credentials are setup
# http://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html
if ! grep -q aws_access_key_id ~/.aws/credentials; then
	if ! grep -q aws_access_key_id ~/.aws/config; then
		fail "AWS config not found or CLI not installed. Please run \"aws configure\"."
	fi
fi

check_command "aws"

# Check for AWS CLI profile argument passed into the script
# http://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html#cli-multiple-profiles
if [ $# -eq 0 ]; then
	scriptname=`basename "$0"`
	echo "Usage: ./$scriptname profile"
	echo "Where profile is the AWS CLI profile name"
	echo "Using default profile"
	profile=default
else
	profile=$1
fi

message "This script will safely fix invalid content-type metadata on AWS S3 bucket website assets."
echo
# pause

# Ensure Variables are set
if [ "$BUCKET" = "YOUR-S3-BUCKET-NAME" ]; then
	read -r -p "Enter the S3 bucket name: " BUCKET
	if [ -z "$BUCKET" ]; then
		fail "Failed to set variables!"
	fi
fi

# Determine the bucket region
REGION=$(aws s3api get-bucket-location --bucket $BUCKET --output text --profile $profile 2>&1)
if [ ! $? -eq 0 ]; then
	fail "$REGION"
fi
if echo $REGION | grep -q "None"; then
	REGION="us-east-1"
fi

message JPG
jpg=$(aws s3 cp --recursive --profile $profile --region $REGION s3://$BUCKET/ s3://$BUCKET/ --exclude "*" --include "*.jpg" --include "*-jpg" --content-encoding "utf8" --content-type "image/jpeg" --metadata-directive "REPLACE" 2>&1)
if [ ! $? -eq 0 ]; then
	fail "$jpg"
fi
if echo $jpg | egrep -iq "error|not"; then
	fail "$jpg"
else
	echo "$jpg"
fi

message JPEG
jpeg=$(aws s3 cp --recursive --profile $profile --region $REGION s3://$BUCKET/ s3://$BUCKET/ --exclude "*" --include "*.jpeg" --include "*-jpeg" --content-encoding "utf8" --content-type "image/jpeg" --metadata-directive "REPLACE" 2>&1)
if [ ! $? -eq 0 ]; then
	fail "$jpeg"
fi
if echo $jpeg | egrep -iq "error|not"; then
	fail "$jpeg"
else
	echo "$jpeg"
fi

message GIF
gif=$(aws s3 cp --recursive --profile $profile --region $REGION s3://$BUCKET/ s3://$BUCKET/ --exclude "*" --include "*.gif" --include "*-gif"  --content-encoding "utf8" --content-type "image/gif" --metadata-directive "REPLACE" 2>&1)
if [ ! $? -eq 0 ]; then
	fail "$gif"
fi
if echo $gif | egrep -iq "error|not"; then
	fail "$gif"
else
	echo "$gif"
fi

message PNG
png=$(aws s3 cp --recursive --profile $profile --region $REGION s3://$BUCKET/ s3://$BUCKET/ --exclude "*" --include "*.png" --include "*-png" --content-encoding "utf8" --content-type "image/png" --metadata-directive "REPLACE" 2>&1)
if [ ! $? -eq 0 ]; then
	fail "$png"
fi
if echo $png | egrep -iq "error|not"; then
	fail "$png"
else
	echo "$png"
fi

message SVG
svg=$(aws s3 cp --recursive --profile $profile --region $REGION s3://$BUCKET/ s3://$BUCKET/ --exclude "*" --include "*.svg" --include "*-svg" --content-encoding "utf8" --content-type "image/svg+xml" --metadata-directive "REPLACE" 2>&1)
if [ ! $? -eq 0 ]; then
	fail "$svg"
fi
if echo $svg | egrep -iq "error|not"; then
	fail "$svg"
else
	echo "$svg"
fi


completed
