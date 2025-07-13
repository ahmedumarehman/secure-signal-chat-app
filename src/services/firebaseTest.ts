import { auth, database } from '../config/firebase';

export const testFirebaseConnection = async () => {
    console.log('=== Firebase Connection Test ===');

    try {
        // Test 1: Check if Firebase is initialized
        console.log('1. Firebase App:', auth.app);
        console.log('   - Project ID:', auth.app.options.projectId);
        console.log('   - Auth Domain:', auth.app.options.authDomain);

        // Test 2: Check current auth state
        console.log('2. Current Auth State:', auth.currentUser);

        // Test 3: Check database connection
        console.log('3. Database:', database);
        console.log('   - Database URL:', database.app.options.databaseURL);

        return true;
    } catch (error) {
        console.error('Firebase connection test failed:', error);
        return false;
    }
};
