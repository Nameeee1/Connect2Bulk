import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 's301ccef3f',  // This must match the resource name from amplify status
  access: (allow) => ({
    'profile-pictures/${cognito-identity.amazonaws.com:sub}/*': [
      allow.authenticated.to(['read', 'write', 'delete'])
    ],
    'profile-pictures/public/*': [
      allow.authenticated.to(['read']),
      allow.guest.to(['read'])
    ]
  })
});