A simple app that was asked for so that they could track/rate/organize the movies they were watching.

Steps needed Set up a Firebase project with

Firebase Authentication turned on for username and password
Firestore turned on

Next goto TMDB [www.themoviedb.org] and register an api key

create an .env or .env.production file (as needed for dev or a prod build)

Fill out the env file with the values from Firebase plus the TMDB api key.  

Example .env file

# Firebase Configuration
# Get the appId from Firebase Console → Project Settings → Your Apps → Web App
# Register a web app if you haven't already, then copy the appId here.
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# TMDB Bearer Token
VITE_TMDB_BEARER_TOKEN=


