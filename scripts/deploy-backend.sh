#!/usr/bin/env bash
# 部署 Newsletter 后端：Lambda + API Gateway + DynamoDB + SNS
# 用法: bash scripts/deploy-backend.sh
set -euo pipefail
cd "$(dirname "$0")/.."

REGION="us-east-1"
STACK="jvyin-newsletter"
ARTIFACTS="jvyin-artifacts"

echo "==> 1/5 确保产物桶存在"
aws s3api create-bucket --bucket "$ARTIFACTS" --region "$REGION" 2>/dev/null \
  && echo "    已创建 s3://$ARTIFACTS" || echo "    s3://$ARTIFACTS 已存在"

echo "==> 2/5 打包 Lambda"
bash scripts/build-lambda.sh

echo "==> 3/5 打包 CloudFormation 模板"
aws cloudformation package \
  --template-file infra/newsletter.yaml \
  --s3-bucket "$ARTIFACTS" \
  --output-template-file dist/aws/packaged-newsletter.yaml \
  --region "$REGION" >/dev/null

echo "==> 4/5 部署栈 $STACK"
aws cloudformation deploy \
  --stack-name "$STACK" \
  --template-file dist/aws/packaged-newsletter.yaml \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --region "$REGION"

echo "==> 5/5 关联 SES 退信/投诉通知 + 联系人列表"
TOPIC_ARN="$(aws cloudformation describe-stacks --stack-name "$STACK" --region "$REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`BounceTopicArn`].OutputValue' --output text)"

aws ses set-identity-notification-topic --identity jvyin.com --notification-type Bounce --sns-topic "$TOPIC_ARN" --region "$REGION"
aws ses set-identity-notification-topic --identity jvyin.com --notification-type Complaint --sns-topic "$TOPIC_ARN" --region "$REGION"
echo "    退信/投诉通知已关联到 SNS"

aws sesv2 create-contact-list \
  --contact-list-name jvyin-newsletter \
  --topics '[{"TopicName":"general","DisplayName":"jvyin newsletter","DefaultSubscriptionStatus":"OPT_IN"}]' \
  --region "$REGION" 2>/dev/null && echo "    联系人列表已创建" || echo "    联系人列表已存在"

API_ENDPOINT="$(aws cloudformation describe-stacks --stack-name "$STACK" --region "$REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' --output text)"
echo ""
echo "✅ 后端部署完成"
echo "   API: $API_ENDPOINT"
echo "   本地开发时在 .env 里设置: PUBLIC_SUBSCRIBE_API_URL=$API_ENDPOINT"
