import type { Handler } from 'aws-lambda';
import { CognitoIdentityProviderClient, AdminDeleteUserCommand } from '@aws-sdk/client-cognito-identity-provider';

const cognito = new CognitoIdentityProviderClient({});

interface Payload {
  username: string; // Cognito username (we use email as username)
  userPoolId?: string; // optional; if not provided, use env
}

export const handler: Handler = async (event: any) => {
  try {
    const payload: Payload = event?.arguments
      ? event.arguments
      : (typeof event?.body === 'string' ? JSON.parse(event.body) : (event as any));

    const username = String(payload?.username || '').trim();
    const userPoolId = String(payload?.userPoolId || process.env.USER_POOL_ID || '').trim();

    if (!username || !userPoolId) {
      throw new Error('Missing username or userPoolId');
    }

    await cognito.send(new AdminDeleteUserCommand({ Username: username, UserPoolId: userPoolId }));
    return true;
  } catch (err: any) {
    console.error('deleteCognitoUser error:', err);
    // Surface a clear error to the caller so Amplify Data returns it in `errors`
    throw new Error(err?.message ?? 'Failed to delete Cognito user');
  }
};
