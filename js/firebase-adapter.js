/**
 * Firebase Database Adapter for TeamForge
 * Extends the existing DatabaseManager to work with Firebase Firestore
 * Maintains localStorage as backup for offline functionality
 */

class FirebaseDatabaseManager extends DatabaseManager {
    constructor() {
        super(); // Initialize the original DatabaseManager
        
        // Firebase instances
        this.firestore = firebase.firestore();
        this.auth = firebase.auth();
        
        // Connection status
        this.isOnline = navigator.onLine;
        this.firebaseReady = false;
        
        // Initialize Firebase features
        this.initializeFirebase();
        this.setupOfflineSupport();
        this.setupConnectionMonitoring();
        
        console.log('🔥 Firebase Database Manager initialized');
    }

    /**
     * Initialize Firebase-specific features
     */
    async initializeFirebase() {
        try {
            // Enable offline persistence for Firestore
            await this.firestore.enablePersistence({
                synchronizeTabs: true
            });
            console.log('✅ Firebase offline persistence enabled');
        } catch (err) {
            if (err.code === 'failed-precondition') {
                console.warn('⚠️ Multiple tabs open, persistence enabled in other tab');
            } else if (err.code === 'unimplemented') {
                console.warn('⚠️ Browser doesn\'t support offline persistence');
            }
        }

        // Listen for auth state changes
        this.auth.onAuthStateChanged((user) => {
            if (user) {
                console.log('🔐 User authenticated:', user.email);
                this.currentUser = {
                    id: user.uid,
                    email: user.email,
                    displayName: user.displayName
                };
                this.syncLocalToFirebase();
            } else {
                console.log('🔓 User signed out');
                this.currentUser = null;
            }
        });

        this.firebaseReady = true;
    }

    /**
     * Setup offline support and monitoring
     */
    setupOfflineSupport() {
        // Monitor online/offline status
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('🌐 Back online - syncing data');
            this.syncLocalToFirebase();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('📱 Offline mode - using localStorage');
        });
    }

    /**
     * Setup connection monitoring for Firestore
     */
    setupConnectionMonitoring() {
        // Monitor Firestore connection state
        this.firestore.doc('.info/connected').onSnapshot((doc) => {
            if (doc.exists) {
                console.log('🔥 Firestore connected');
            } else {
                console.log('🔥 Firestore disconnected');
            }
        });
    }

    /**
     * Enhanced getTable method - tries Firebase first, falls back to localStorage
     */
    async getTable(tableName) {
        try {
            // If offline or Firebase not ready, use localStorage
            if (!this.isOnline || !this.firebaseReady) {
                console.log(`📱 Getting ${tableName} from localStorage (offline)`);
                return super.getTable(tableName);
            }

            // Try to get data from Firebase
            console.log(`🔥 Getting ${tableName} from Firebase`);
            const snapshot = await this.firestore.collection(tableName).get();
            
            const data = [];
            snapshot.forEach(doc => {
                data.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            // Cache in localStorage for offline access
            super.setTable(tableName, data);
            
            console.log(`✅ Retrieved ${data.length} records from ${tableName}`);
            return data;

        } catch (error) {
            console.error(`❌ Firebase error for ${tableName}, using localStorage:`, error);
            return super.getTable(tableName);
        }
    }

    /**
     * Enhanced setTable method - saves to both Firebase and localStorage
     */
    async setTable(tableName, data) {
        // Always save to localStorage first (immediate + offline backup)
        super.setTable(tableName, data);
        console.log(`💾 Saved ${tableName} to localStorage`);

        // If online and Firebase ready, also save to Firebase
        if (this.isOnline && this.firebaseReady) {
            try {
                console.log(`🔥 Syncing ${tableName} to Firebase...`);
                
                // Use batch write for better performance
                const batch = this.firestore.batch();
                
                // Clear existing collection first
                const existingDocs = await this.firestore.collection(tableName).get();
                existingDocs.forEach(doc => {
                    batch.delete(doc.ref);
                });

                // Add new data
                data.forEach(item => {
                    const docRef = this.firestore.collection(tableName).doc(item.id || this.generateId());
                    batch.set(docRef, {
                        ...item,
                        lastModified: firebase.firestore.FieldValue.serverTimestamp(),
                        modifiedBy: this.currentUser?.id || 'unknown'
                    });
                });

                await batch.commit();
                console.log(`✅ Successfully synced ${data.length} records to Firebase`);

            } catch (error) {
                console.error(`❌ Failed to sync ${tableName} to Firebase:`, error);
                // Data is still saved locally, so app continues working
            }
        }
    }

    /**
     * Sync all localStorage data to Firebase
     */
    async syncLocalToFirebase() {
        if (!this.isOnline || !this.firebaseReady) return;

        console.log('🔄 Starting full sync to Firebase...');
        
        const tables = [
            'users', 'teams', 'player_profiles', 'team_memberships',
            'notes', 'events', 'game_stats', 'season_stats',
            'lineups', 'availability', 'registration_keys'
        ];

        for (const table of tables) {
            const localData = super.getTable(table);
            if (localData && localData.length > 0) {
                console.log(`🔄 Syncing ${table}: ${localData.length} records`);
                await this.setTable(table, localData);
            }
        }

        console.log('✅ Full sync completed');
    }

    /**
     * Enhanced authentication with Firebase Auth
     */
    async authenticate(username, password) {
        try {
            // Try Firebase authentication first
            if (this.firebaseReady) {
                console.log('🔐 Attempting Firebase authentication...');
                
                const result = await this.auth.signInWithEmailAndPassword(username, password);
                const user = result.user;

                // Update current user
                this.currentUser = {
                    id: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    last_login: new Date().toISOString()
                };

                // Save to localStorage for offline access
                localStorage.setItem(this.storagePrefix + 'current_user', JSON.stringify(this.currentUser));

                console.log('✅ Firebase authentication successful');
                return { success: true, user: this.currentUser };
            }
        } catch (error) {
            console.log('⚠️ Firebase auth failed, trying localStorage:', error.message);
        }

        // Fallback to original localStorage authentication
        return super.authenticate(username, password);
    }

    /**
     * Enhanced registration with Firebase Auth
     */
    async register(userData) {
        try {
            // Try Firebase registration first
            if (this.firebaseReady) {
                console.log('🔐 Creating Firebase user account...');
                
                const result = await this.auth.createUserWithEmailAndPassword(
                    userData.email, 
                    userData.password
                );
                
                const user = result.user;

                // Update user profile
                await user.updateProfile({
                    displayName: userData.first_name + ' ' + userData.last_name
                });

                // Create user record in Firestore
                const userRecord = {
                    id: user.uid,
                    username: userData.username,
                    email: userData.email,
                    first_name: userData.first_name,
                    last_name: userData.last_name,
                    role: userData.role || 'player',
                    is_active: true,
                    created_at: new Date().toISOString(),
                    last_login: new Date().toISOString()
                };

                // Save to both Firebase and localStorage
                const users = await this.getTable('users') || [];
                users.push(userRecord);
                await this.setTable('users', users);

                console.log('✅ Firebase registration successful');
                return { success: true, user: userRecord };
            }
        } catch (error) {
            console.log('⚠️ Firebase registration failed, trying localStorage:', error.message);
            
            if (error.code === 'auth/email-already-in-use') {
                return { success: false, message: 'Email already registered' };
            }
        }

        // Fallback to original localStorage registration
        return super.register(userData);
    }

    /**
     * Logout user from both Firebase and localStorage
     */
    async logout() {
        try {
            if (this.firebaseReady) {
                await this.auth.signOut();
                console.log('🔓 Firebase logout successful');
            }
        } catch (error) {
            console.error('❌ Firebase logout error:', error);
        }

        // Always clear localStorage session
        super.logout();
    }

    /**
     * Real-time listener for table changes
     */
    onTableChange(tableName, callback) {
        if (!this.firebaseReady) return;

        return this.firestore.collection(tableName).onSnapshot(
            (snapshot) => {
                const data = [];
                snapshot.forEach(doc => {
                    data.push({ id: doc.id, ...doc.data() });
                });
                
                // Update localStorage cache
                super.setTable(tableName, data);
                
                // Call the callback with new data
                callback(data);
            },
            (error) => {
                console.error(`❌ Real-time listener error for ${tableName}:`, error);
            }
        );
    }

    /**
     * Get connection status
     */
    getConnectionStatus() {
        return {
            online: this.isOnline,
            firebaseReady: this.firebaseReady,
            authenticated: !!this.currentUser
        };
    }
}

// Replace the global database instance if Firebase is available
if (typeof firebase !== 'undefined') {
    console.log('🔥 Initializing Firebase Database Manager...');
    window.db = new FirebaseDatabaseManager();
} else {
    console.log('📱 Firebase not available, using localStorage Database Manager');
    // Keep the original DatabaseManager
}
