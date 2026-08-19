export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
  },
});
