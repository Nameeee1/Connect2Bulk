import { defineFunction } from '@aws-amplify/backend';

// IMPORTANT: Replace this with your verified SES sender identity.
// You must verify this email address (or domain) in Amazon SES and, if using SES sandbox,
// you must also verify recipient emails or move out of the sandbox.
const DEFAULT_FROM = 'no-reply@example.com';

export const sendResetEmail = defineFunction({
  name: 'sendResetEmail',
  entry: './handler.ts',
  environment: {
    FROM_EMAIL: DEFAULT_FROM,
  },
  timeoutSeconds: 15,
  // Note: If your project type supports permissions here, grant SES permissions to the Lambda role.
  // Some templates infer policies automatically. If not, you may need to attach a policy manually to allow:
  //   - ses:SendEmail
  //   - ses:SendRawEmail
});
