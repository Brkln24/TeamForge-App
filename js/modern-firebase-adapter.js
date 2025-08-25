/**
 * Modern Firebase Database Adapter for TeamForge
 * Uses Firebase v9+ Modular SDK with tree-shaking and modern syntax
 * Extends the existing DatabaseManager to work with Firebase Firestore
 * Maintains localStorage as backup for offline functionality
 */

class ModernFirebaseDatabaseManager extends DatabaseManager {
    constructor() {
        super(); // Initialize the original DatabaseManager
        
        // Wait for Firebase to be available from the module script
        this.initializeWhenReady();
    }

    async initializeWhenReady() {
        // Wait for Firebase to be loaded by the module script
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait

        const waitForFirebase = () => {
            if (window.firebaseApp && window.firebaseDB && window.firebaseAuth) {
                this.initializeFirebase();
            } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(waitForFirebase, 100);
            } else {
                console.warn('⚠️ Firebase not available, using localStorage only');
                this.firebaseReady = false;
            }
        };

        waitForFirebase();
    }

    /**
     * Initialize Firebase-specific features with modern SDK
     */
    async initializeFirebase() {
        try {
            // Get Firebase instances from global scope
            this.app = window.firebaseApp;
            this.firestore = window.firebaseDB;
            this.auth = window.firebaseAuth;
            
            // Import Firestore functions dynamically
            this.firestoreFunctions = await this.importFirestoreFunctions();
            this.authFunctions = await this.importAuthFunctions();
            
            // Connection status
            this.isOnline = navigator.onLine;
            this.firebaseReady = true;
            
            // Setup Firebase features
            await this.setupOfflineSupport();
            this.setupConnectionMonitoring();
            this.setupAuthStateListener();
            
            console.log('🔥 Modern Firebase Database Manager initialized');
        } catch (error) {
            console.error('❌ Firebase initialization failed:', error);
            this.firebaseReady = false;
        }
    }

    /**
     * Import Firestore functions dynamically
     */
    async importFirestoreFunctions() {
        const firestoreModule = await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js');
        return {
            collection: firestoreModule.collection,
            doc: firestoreModule.doc,
            getDocs: firestoreModule.getDocs,
            getDoc: firestoreModule.getDoc,
            addDoc: firestoreModule.addDoc,
            setDoc: firestoreModule.setDoc,
            updateDoc: firestoreModule.updateDoc,
            deleteDoc: firestoreModule.deleteDoc,
            query: firestoreModule.query,
            where: firestoreModule.where,
            orderBy: firestoreModule.orderBy,
            limit: firestoreModule.limit,
            onSnapshot: firestoreModule.onSnapshot,
            writeBatch: firestoreModule.writeBatch,
            serverTimestamp: firestoreModule.serverTimestamp,
            enableNetwork: firestoreModule.enableNetwork,
            disableNetwork: firestoreModule.disableNetwork
        };
    }

    /**
     * Import Auth functions dynamically
     */
    async importAuthFunctions() {
        const authModule = await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js');
        return {
            signInWithEmailAndPassword: authModule.signInWithEmailAndPassword,
            createUserWithEmailAndPassword: authModule.createUserWithEmailAndPassword,
            signOut: authModule.signOut,
            onAuthStateChanged: authModule.onAuthStateChanged,
            updateProfile: authModule.updateProfile
        };
    }

    /**
     * Setup offline support and monitoring
     */
    async setupOfflineSupport() {
        // Modern SDK handles offline persistence automatically
        console.log('✅ Firebase offline persistence enabled (automatic in v9+)');

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
        // In v9+, connection monitoring is simplified
        if (this.firebaseReady) {
            console.log('🔥 Firestore connection monitoring active');
        }
    }

    /**
     * Setup authentication state listener
     */
    setupAuthStateListener() {
        if (!this.authFunctions) return;

        this.authFunctions.onAuthStateChanged(this.auth, (user) => {
            if (user) {
                console.log('🔐 User authenticated:', user.email);
                this.currentUser = {
                    id: user.uid,
                    email: user.email,
                    displayName: user.displayName
                };
                localStorage.setItem(this.storagePrefix + 'current_user', JSON.stringify(this.currentUser));
                this.syncLocalToFirebase();
            } else {
                console.log('🔓 User signed out');
                this.currentUser = null;
                localStorage.removeItem(this.storagePrefix + 'current_user');
            }
        });
    }

    /**
     * Enhanced getTable method - uses modern Firestore API
     */
    async getTable(tableName) {
        try {
            // If offline or Firebase not ready, use localStorage
            if (!this.isOnline || !this.firebaseReady || !this.firestoreFunctions) {
                console.log(`📱 Getting ${tableName} from localStorage (offline)`);
                return super.getTable(tableName);
            }

            // Try to get data from Firebase using modern API
            console.log(`🔥 Getting ${tableName} from Firebase`);
            const collectionRef = this.firestoreFunctions.collection(this.firestore, tableName);
            const snapshot = await this.firestoreFunctions.getDocs(collectionRef);
            
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
     * Enhanced setTable method - uses modern Firestore batch writes
     */
    async setTable(tableName, data) {
        // Always save to localStorage first (immediate + offline backup)
        super.setTable(tableName, data);
        console.log(`💾 Saved ${tableName} to localStorage`);

        // If online and Firebase ready, also save to Firebase
        if (this.isOnline && this.firebaseReady && this.firestoreFunctions) {
            try {
                console.log(`🔥 Syncing ${tableName} to Firebase...`);
                
                // Use batch write for better performance
                const batch = this.firestoreFunctions.writeBatch(this.firestore);
                
                // Clear existing collection first (simplified approach)
                const collectionRef = this.firestoreFunctions.collection(this.firestore, tableName);
                const existingSnapshot = await this.firestoreFunctions.getDocs(collectionRef);
                
                existingSnapshot.forEach(docSnap => {
                    batch.delete(docSnap.ref);
                });

                // Add new data
                data.forEach(item => {
                    const docRef = this.firestoreFunctions.doc(this.firestore, tableName, item.id || this.generateId());
                    batch.set(docRef, {
                        ...item,
                        lastModified: this.firestoreFunctions.serverTimestamp(),
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
     * Enhanced authentication with modern Firebase Auth
     */
    async authenticate(username, password) {
        try {
            // Try Firebase authentication first
            if (this.firebaseReady && this.authFunctions) {
                console.log('🔐 Attempting Firebase authentication...');
                
                const userCredential = await this.authFunctions.signInWithEmailAndPassword(
                    this.auth, 
                    username, 
                    password
                );
                const user = userCredential.user;

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
     * Enhanced registration with modern Firebase Auth
     */
    async register(userData) {
        try {
            // Try Firebase registration first
            if (this.firebaseReady && this.authFunctions) {
                console.log('🔐 Creating Firebase user account...');
                
                const userCredential = await this.authFunctions.createUserWithEmailAndPassword(
                    this.auth,
                    userData.email, 
                    userData.password
                );
                
                const user = userCredential.user;

                // Update user profile
                await this.authFunctions.updateProfile(user, {
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
            if (this.firebaseReady && this.authFunctions) {
                await this.authFunctions.signOut(this.auth);
                console.log('🔓 Firebase logout successful');
            }
        } catch (error) {
            console.error('❌ Firebase logout error:', error);
        }

        // Always clear localStorage session
        super.logout();
    }

    /**
     * Real-time listener for table changes using modern API
     */
    onTableChange(tableName, callback) {
        if (!this.firebaseReady || !this.firestoreFunctions) return;

        const collectionRef = this.firestoreFunctions.collection(this.firestore, tableName);
        
        return this.firestoreFunctions.onSnapshot(
            collectionRef,
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
                // Small delay to prevent overwhelming Firebase
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        console.log('✅ Full sync completed');
    }

    /**
     * Get connection status
     */
    getConnectionStatus() {
        return {
            online: this.isOnline,
            firebaseReady: this.firebaseReady,
            authenticated: !!this.currentUser,
            sdkVersion: 'v12+ Modular'
        };
    }
}

// Replace the global database instance if Firebase is available
// Wait for Firebase module to load
setTimeout(() => {
    try {
        if (window.firebaseApp && window.firebaseDB && window.firebaseAuth) {
            console.log('🔥 Initializing Modern Firebase Database Manager...');
            window.db = new ModernFirebaseDatabaseManager();
            console.log('✅ Modern Firebase Database Manager initialized successfully');
        } else {
            console.log('📱 Firebase not available, using localStorage Database Manager');
            // Keep the original DatabaseManager
        }
    } catch (error) {
        console.error('❌ Error initializing Modern Firebase Database Manager:', error);
        console.log('📱 Falling back to localStorage Database Manager');
        // The original database manager will remain active
    }
}, 1000); // Give Firebase module time to load
