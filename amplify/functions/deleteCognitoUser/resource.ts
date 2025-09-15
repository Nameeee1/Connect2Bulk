import { defineFunction } from '@aws-amplify/backend';

export const deleteCognitoUser = defineFunction({
  name: 'deleteCognitoUser',
  entry: './handler.ts',
  // You may optionally set USER_POOL_ID here via environment if you prefer not to pass it from the client
  environment: {
    // USER_POOL_ID: 'us-east-1_XXXXXXXXX',
  },
  timeoutSeconds: 15,
});
