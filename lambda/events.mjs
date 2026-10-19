/**
 * SES 退信/投诉处理（SNS → Lambda）
 * - Bounce（硬退信）：标记 bounced，不再发送
 * - Complaint（垃圾邮件投诉）：标记 unsubscribed，立即停止发送
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const { TABLE = 'jvyin-subscribers' } = process.env;

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event) => {
  for (const record of event.Records ?? []) {
    let msg;
    try {
      msg = JSON.parse(record.Sns?.Message ?? '{}');
    } catch {
      continue;
    }

    const type = msg.notificationType ?? msg.eventType;
    console.log('SES notification:', type);

    const newStatus =
      type === 'Bounce' ? 'bounced' :
      type === 'Complaint' ? 'unsubscribed' :
      null;
    if (!newStatus) continue;

    const emails = new Set(
      (msg.mail?.destination ?? []).concat(msg.mail?.commonHeaders?.to ?? []).map(String)
    );

    for (const email of emails) {
      try {
        await ddb.send(new UpdateCommand({
          TableName: TABLE,
          Key: { email: email.toLowerCase() },
          UpdateExpression: 'SET #s = :s, lastEvent = :r',
          ExpressionAttributeNames: { '#s': 'status' },
          ExpressionAttributeValues: {
            ':s': newStatus,
            ':r': JSON.stringify({ type, at: new Date().toISOString(), detail: msg.bounce ?? msg.complaint ?? {} }).slice(0, 3500),
          },
        }));
      } catch (err) {
        console.error('update failed for', email, err);
      }
    }
  }
};
