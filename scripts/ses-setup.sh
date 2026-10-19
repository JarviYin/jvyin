#!/usr/bin/env bash
# SES 域名验证：为 jvyin.com 配置 DKIM / SPF(MAIL FROM) / DMARC
# 用法: bash scripts/ses-setup.sh
set -euo pipefail

REGION="us-east-1"
DOMAIN="jvyin.com"
HOSTED_ZONE_ID="Z07178802NZXJVAG1M8HF"   # jvyin.com 的 Route 53 托管区
MAIL_FROM_DOMAIN="mail.jvyin.com"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "==> 1/5 创建 SES 域名身份（Easy DKIM）"
aws sesv2 create-email-identity --email-identity "$DOMAIN" --region "$REGION" 2>/dev/null \
  || echo "    (身份已存在，跳过)"

echo "==> 2/5 读取 DKIM tokens"
IDENTITY="$(aws sesv2 get-email-identity --email-identity "$DOMAIN" --region "$REGION")"
STATUS="$(echo "$IDENTITY" | jq -r '.VerificationStatus')"
echo "    当前验证状态: $STATUS"
TOKENS="$(echo "$IDENTITY" | jq -r '.DkimAttributes.Tokens[]?')"

if [ -z "$TOKENS" ]; then
  echo "!! 没有拿到 DKIM tokens，请稍后重试。"
  exit 1
fi

echo "==> 3/5 写入 Route 53：DKIM CNAME ×3 + DMARC + SPF/MX (MAIL FROM)"
# 构建 change-batch JSON
jq -n --arg domain "$DOMAIN" --arg mfd "$MAIL_FROM_DOMAIN" \
  --argjson tokens "$(echo "$TOKENS" | jq -R -s -c 'split("\n") | map(select(length>0))')" '
  { Changes: (
    [ $tokens[] as $t
      | {Action:"UPSERT", ResourceRecordSet:{
          Name: ($t + "._domainkey." + $domain),
          Type:"CNAME", TTL:300,
          ResourceRecords:[{Value: ($t + ".dkim.amazonses.com")}]}} ]
    + [
      {Action:"UPSERT", ResourceRecordSet:{
         Name:("_dmarc." + $domain), Type:"TXT", TTL:300,
         ResourceRecords:[{Value:"\"v=DMARC1; p=quarantine; adkim=s; aspf=s;\""}]}},
      {Action:"UPSERT", ResourceRecordSet:{
         Name:$mfd, Type:"TXT", TTL:300,
         ResourceRecords:[{Value:"\"v=spf1 include:amazonses.com ~all\""}]}},
      {Action:"UPSERT", ResourceRecordSet:{
         Name:$mfd, Type:"MX", TTL:300,
         ResourceRecords:[{Value:"10 feedback-smtp.us-east-1.amazonses.com"}]}}
    ]
  ) }' > "$TMP/batch.json"

aws route53 change-resource-record-sets \
  --hosted-zone-id "$HOSTED_ZONE_ID" \
  --change-batch "file://$TMP/batch.json" \
  --query 'ChangeInfo.{Id:Id,Status:Status}' --output text

echo "==> 4/5 设置 MAIL FROM 域为 $MAIL_FROM_DOMAIN"
aws sesv2 put-email-identity-mail-from-attributes \
  --email-identity "$DOMAIN" \
  --mail-from-domain "$MAIL_FROM_DOMAIN" \
  --behavior-on-mx-failure USE_DEFAULT_VALUE \
  --region "$REGION" && echo "    OK"

echo "==> 5/5 当前状态"
aws sesv2 get-email-identity --email-identity "$DOMAIN" --region "$REGION" \
  | jq '{VerificationStatus, DkimStatus: .DkimAttributes.Status, MailFrom: .MailFromAttributes.MailFromDomain, MailFromStatus: .MailFromAttributes.MailFromDomainStatus}'

echo ""
echo "DNS 记录已写入。DKIM 验证通常需要几分钟到十几分钟生效。"
echo "检查: aws sesv2 get-email-identity --email-identity jvyin.com --query VerificationStatus"
