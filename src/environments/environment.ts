export const environment = {
    urlApi: 'http://127.0.0.1:8000/api/',
    urlApiImages: 'http://127.0.0.1:8000',
    production: false,
    googleMapsApiKey: import.meta.env.NG_APP_GOOGLE_MAPS_API_KEY,
    firebaseConfig: {
        apiKey: import.meta.env.NG_APP_FIREBASE_API_KEY,
        authDomain: import.meta.env.NG_APP_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.NG_APP_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.NG_APP_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.NG_APP__FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.NG_APP_FIREBASE_APP_ID,  
    }
};
