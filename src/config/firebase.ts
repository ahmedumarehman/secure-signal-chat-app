// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyDsh-TJ1-U3zK9DeW8faKtZMcOJgXjgLcU",
    authDomain: "emrchains-56fb0.firebaseapp.com",
    databaseURL: "https://emrchains-56fb0-default-rtdb.firebaseio.com",
    projectId: "emrchains-56fb0",
    storageBucket: "emrchains-56fb0.firebasestorage.app",
    messagingSenderId: "195038908070",
    appId: "1:195038908070:web:b57b89d9c22dc22a6bae67",
    measurementId: "G-S4E8DTBT5G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Realtime Database and get a reference to the service
export const database = getDatabase(app);

// Initialize Analytics (optional)
let analytics;
try {
    analytics = getAnalytics(app);
} catch (error) {
    console.log('Analytics not available:', error);
}
export { analytics };

export default app;
