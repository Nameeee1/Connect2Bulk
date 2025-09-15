import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { sendResetEmail } from './functions/sendResetEmail/resource';
import { deleteCognitoUser } from './functions/deleteCognitoUser/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
defineBackend({
  auth,
  data,
  sendResetEmail,
  deleteCognitoUser,
});
