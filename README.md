# Farm Chat

A nostalgic chat application with modern features, built with Firebase and JavaScript.

## Security Features

- Environment variables for sensitive configuration
- Firebase security rules
- Offline persistence
- Secure authentication
- Protected API keys

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with your Firebase configuration:
   ```
   FIREBASE_API_KEY=your_api_key
   FIREBASE_AUTH_DOMAIN=your_auth_domain
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_STORAGE_BUCKET=your_storage_bucket
   FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   FIREBASE_APP_ID=your_app_id
   ```

4. Start the development server:
   ```bash
   npm start
   ```

5. Build for production:
   ```bash
   npm run build
   ```

## Security Considerations

1. Never commit the `.env` file to version control
2. Set up Firebase Security Rules to restrict access:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read: if true;
         allow write: if request.auth != null && request.auth.uid == userId;
       }
       match /messages/{messageId} {
         allow read: if true;
         allow create: if request.auth != null;
         allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
       }
     }
   }
   ```

3. Enable Firebase Authentication methods in the Firebase Console
4. Set up Firebase Storage rules to protect user uploads
5. Use HTTPS in production
6. Implement rate limiting for API calls

## Features

- User authentication with email/password
- Real-time chat messaging
- User profiles with avatars
- Status messages
- Spotify song integration
- Offline support
- Responsive design

## Development

The project uses Parcel as a bundler to handle environment variables and asset compilation. During development, the `.env` file is used to inject environment variables into the build.

For production deployment, make sure to:
1. Set up proper environment variables in your hosting platform
2. Enable CORS if needed
3. Configure proper security headers
4. Set up SSL/TLS certificates 