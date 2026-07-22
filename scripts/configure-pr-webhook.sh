#!/usr/bin/env bash

set -euo pipefail

AWS_REGION="${AWS_REGION:-us-west-2}"
CODEBUILD_PROJECT="${CODEBUILD_PROJECT:-jy-aigc-go-pr-preview}"
GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-Jade-ops-tech/jy-aigc}"
GITHUB_ACTOR_ACCOUNT_ID="${GITHUB_ACTOR_ACCOUNT_ID:-148870035}"
BASE_BRANCH="${BASE_BRANCH:-main}"

event_pattern="PULL_REQUEST_CREATED,PULL_REQUEST_UPDATED,PULL_REQUEST_REOPENED,PULL_REQUEST_MERGED,PULL_REQUEST_CLOSED"
filter_groups="[[{\"type\":\"EVENT\",\"pattern\":\"${event_pattern}\"},{\"type\":\"BASE_REF\",\"pattern\":\"^refs/heads/${BASE_BRANCH}$\"},{\"type\":\"ACTOR_ACCOUNT_ID\",\"pattern\":\"${GITHUB_ACTOR_ACCOUNT_ID}\"}]]"

read -r payload_url webhook_secret <<< "$(
	aws codebuild create-webhook \
		--region "${AWS_REGION}" \
		--project-name "${CODEBUILD_PROJECT}" \
		--manual-creation \
		--filter-groups "${filter_groups}" \
		--pull-request-build-policy requiresCommentApproval=DISABLED \
		--query 'webhook.[payloadUrl,secret]' \
		--output text
)"

if [[ -z "${payload_url}" || -z "${webhook_secret}" ]]; then
	echo "CodeBuild did not return a manual webhook payload URL and secret." >&2
	exit 1
fi

gh api \
	--method POST \
	-H "Accept: application/vnd.github+json" \
	"repos/${GITHUB_REPOSITORY}/hooks" \
	-f name=web \
	-F active=true \
	-F 'events[]=pull_request' \
	-f "config[url]=${payload_url}" \
	-f 'config[content_type]=json' \
	-f "config[secret]=${webhook_secret}" \
	-f 'config[insecure_ssl]=0' \
	--silent

echo "Configured the manual CodeBuild PR webhook for ${GITHUB_REPOSITORY}."
