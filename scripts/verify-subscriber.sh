#!/usr/bin/env bash
# 订阅全流程验证脚本（真实邮箱）
# 用法:
#   bash scripts/verify-subscriber.sh subscribe you@example.com   # 发起订阅（用户点确认邮件链接）
#   bash scripts/verify-subscriber.sh status    you@example.com   # 查看 DynamoDB 状态
#   bash scripts/verify-subscriber.sh unsubscribe you@example.com # 退订
#   bash scripts/verify-subscriber.sh cleanup   you@example.com   # 清理测试数据（DynamoDB + 联系人列表）
set -euo pipefail
cd "$(dirname "$0")/.."

REGION="us-east-1"
TABLE="jvyin-subscribers"
CONTACT_LIST="jvyin-newsletter"
SITE="${SITE:-https://jvyin.com}"

CMD="${1:-}"; EMAIL="${2:-}"
[ -n "$CMD" ] && [ -n "$EMAIL" ] || { echo "用法: bash scripts/verify-subscriber.sh <subscribe|status|unsubscribe|cleanup> <email>"; exit 1; }

KEY="{\"email\":{\"S\":\"$EMAIL\"}}"

case "$CMD" in
  subscribe)
    echo "==> POST $SITE/api/subscribe ($EMAIL)"
    curl -s -X POST "$SITE/api/subscribe" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\"}"; echo
    sleep 1
    TOKEN=$(aws dynamodb get-item --table-name "$TABLE" --region "$REGION" --key "$KEY" --query 'Item.token.S' --output text 2>/dev/null || echo "")
    if [ -n "$TOKEN" ] && [ "$TOKEN" != "None" ]; then
      echo "==> 确认链接（发到了你的邮箱，也可以直接打开这个）:"
      echo "    $SITE/confirm?token=$TOKEN"
    fi
    ;;
  status)
    aws dynamodb get-item --table-name "$TABLE" --region "$REGION" --key "$KEY" \
      --query 'Item.{status:status.S,createdAt:createdAt.S,confirmedAt:confirmedAt.S,unsubscribedAt:unsubscribedAt.S}' --output json
    ;;
  unsubscribe)
    curl -s -X POST "$SITE/api/unsubscribe" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\"}"; echo
    ;;
  cleanup)
    aws dynamodb delete-item --table-name "$TABLE" --region "$REGION" --key "$KEY" >/dev/null
    aws sesv2 delete-contact --contact-list-name "$CONTACT_LIST" --email-address "$EMAIL" --region "$REGION" 2>/dev/null || true
    echo "已清理: $EMAIL"
    ;;
  *)
    echo "未知命令: $CMD"; exit 1;;
esac
