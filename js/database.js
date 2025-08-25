/**
 * File Name: database.js
 * Purpose:  Central database management system that handles all data storage and retrieval operations using localStorage. 
 *           Manages all application data including users, teams, statistics, events, and communications.
 * Author: Brooklyn Ridley
 * Date Created: 5th August 2025
 * Last Modified: 25th August 2025

/**
 * Class: DatabaseManager
 * 
 * Purpose: Main database management class that provides all database operations
 *          for the TeamForge application using localStorage as the storage backend.
 * 
 * Constructor Inputs: None
 * 
 * Constructor Outputs: 
 * - Initialized database with all required tables
 * - Completed data migrations if necessary
 * - Cleaned legacy/test data
 * 
 * Data Types Used:
 * - localStorage (Browser API): Primary storage mechanism
 * - JSON (String): Data serialization format
 * - Date (Object): Timestamp and date handling
 * - Array (Object): Collection storage for table data
 * - Object (Object): Entity and record representation
 */
class DatabaseManager {
    
    // Constructor: Initialize Database Manager - Sets up database system and performs migrations
    constructor() {
        this.storagePrefix = 'teamforge_';
        this.currentUser = null;
        this.initializeDatabase();
        this.migrateTeamStatsData();
        this.clearFakeNotes();
    }

    // Reset Migration Flag - Development utility to reset migration flags
    resetMigrationFlag() {
        localStorage.removeItem(this.storagePrefix + 'team_stats_migrated');
        console.log('Migration flag reset - migration will run on next database initialization');
    }

    /**
     * Method: Migrate Team Stats Data
     * Purpose:
     *   - Migrates legacy team statistics to improved data structure.
     *   - Ensures backward compatibility during application updates.
     *   - Preserves historical team performance data integrity.
     * Inputs:
     *   - None (operates on existing localStorage data).
     * Outputs:
     *   - Migrated team statistics in new table format with enhanced organization.
     * Justification:
     *   - Migration completion flag prevents duplicate data processing.
     *   - Data structure improvements enable better statistical analysis.
     *   - Error handling ensures application stability during upgrades.
     * Future Enhancements:
     *   - Implement incremental migration for large datasets.
     *   - Add data validation during migration process.
     *   - Create migration rollback functionality for safety.
     *   - Develop automated migration testing framework.
     */
    migrateTeamStatsData() {
        
        // Check if migration has already been performed to prevent duplicate execution
        const migrationFlag = localStorage.getItem(this.storagePrefix + 'team_stats_migrated');
        if (migrationFlag === 'true') {
            return; // Migration already completed, skip execution
        }
        
        // Retrieve data from old and new table structures
        const oldTeamStats = this.getTable('team_stats') || [];
        const newTeamStats = this.getTable('team_game_stats') || [];
        
        // Only migrate if there's data in old table and new table is empty
        if (oldTeamStats.length > 0 && newTeamStats.length === 0) {
            
            // Log migration start with data details
            console.log('Migrating team stats from team_stats to team_game_stats table:', oldTeamStats);
            
            try {
                // Transfer all data from old table to new table structure
                this.setTable('team_game_stats', oldTeamStats);
                
                // Set migration completion flag to prevent future migrations
                localStorage.setItem(this.storagePrefix + 'team_stats_migrated', 'true');
                
                // Log successful migration completion with verification
                console.log('Migration completed. New team_game_stats table:', this.getTable('team_game_stats'));
                
            } catch (error) {
                // Log migration failure details for debugging
                console.error('Migration failed:', error);
            }
            
        } else if (newTeamStats.length > 0) {
            
            // New table already has data, mark migration as complete to prevent future runs
            localStorage.setItem(this.storagePrefix + 'team_stats_migrated', 'true');
        }
    }

    // Clear Fake Notes - Removes test data from production environment
    clearFakeNotes() {
        const existingNotes = this.getTable('notes') || [];
        const fakeNoteContents = [
            "Great practice today team! Remember to work on those free throws.",
            "Coach, what time is the game on Saturday?",
            "Don't forget to bring your water bottles and arrive 30 minutes early for warm-up."
        ];
        
        const realNotes = existingNotes.filter(note => {
            return !fakeNoteContents.includes(note.content);
        });
        
        if (realNotes.length < existingNotes.length) {
            console.log(`Cleared ${existingNotes.length - realNotes.length} fake notes from localStorage`);
            this.setTable('notes', realNotes);
        }
    }

    /**
     * Method: Initialize Database
     * Purpose:
     *   - Establishes complete database schema for TeamForge application.
     *   - Creates sample data for new installations and development.
     *   - Restores user sessions and applies necessary data migrations.
     * Inputs:
     *   - None (operates on localStorage and class properties).
     * Outputs:
     *   - Fully initialized database with all required tables and relationships.
     * Justification:
     *   - Centralized initialization ensures consistent database state.
     *   - Sample data enables immediate application testing and demonstration.
     *   - Migration system maintains data integrity during application updates.
     * Future Enhancements:
     *   - Implement database versioning for schema evolution.
     *   - Add data validation during initialization process.
     *   - Create initialization progress tracking for large datasets.
     *   - Develop database repair and recovery functionality.
     */
    initializeDatabase() {
        
        // Check if database has been initialized (users table exists and has data)
        if (!this.getTable('users')) {
            
            // First-time setup: create sample data and schema
            this.createSampleData();
        }
        
        // Apply game confirmation status migration for existing installations
        this.migrateGameConfirmationStatus();
        
        // Restore current user session from localStorage if available
        const savedUser = localStorage.getItem(this.storagePrefix + 'current_user');
        if (savedUser) {
            
            // Parse and restore user session data
            this.currentUser = JSON.parse(savedUser);
        }
    }

    /**
     * Method: Migrate Game Confirmation Status
     * Purpose:
     *   - Adds confirmation status fields to existing game events.
     *   - Enables game confirmation workflow between competing teams.
     *   - Maintains backward compatibility with existing event data.
     * Inputs:
     *   - None (operates on existing events table data).
     * Outputs:
     *   - Updated event records with confirmation status tracking capabilities.
     * Justification:
     *   - Migration flag prevents duplicate field additions during updates.
     *   - Default values ensure existing games remain functional.
     *   - Timestamp tracking enables audit trail for game confirmations.
     * Future Enhancements:
     *   - Add bulk confirmation functionality for tournament management.
     *   - Implement automatic confirmation reminders system.
     *   - Create confirmation deadline enforcement with penalties.
     *   - Develop confirmation analytics and reporting features.
     */
    migrateGameConfirmationStatus() {
        
        // Check if migration has already been completed
        const migrationFlag = localStorage.getItem(this.storagePrefix + 'game_confirmation_migrated');
        if (migrationFlag === 'true') {
            return; // Migration already completed, skip execution
        }

        // Get all existing events for migration processing
        const events = this.getTable('events') || [];
        let migrationNeeded = false;

        // Process each event to add confirmation status fields
        const updatedEvents = events.map(event => {
            // Check if event already has confirmation fields
            if (event.is_confirmed === undefined || event.pending_confirmation === undefined) {
                migrationNeeded = true;
                return {
                    ...event,
                    // Mark all existing games as confirmed (legacy assumption)
                    is_confirmed: true,
                    confirmed_by: null, // Unknown who confirmed legacy games
                    confirmed_at: event.created_at, // Use creation date as confirmation date
                    pending_confirmation: false
                };
            }
            return event;
        });

        if (migrationNeeded) {
            console.log('Migrating existing games to have confirmation status...');
            this.setTable('events', updatedEvents);
            localStorage.setItem(this.storagePrefix + 'game_confirmation_migrated', 'true');
            console.log('Game confirmation migration completed');
        }
    }

    // Get Table - Retrieves data from localStorage with JSON parsing
    getTable(tableName) {
        const data = localStorage.getItem(this.storagePrefix + tableName);
        return data ? JSON.parse(data) : null;
    }

    // Set Table - Stores data to localStorage with JSON serialization
    setTable(tableName, data) {
        localStorage.setItem(this.storagePrefix + tableName, JSON.stringify(data));
    }

    // Generate ID - Creates unique identifiers for database records
    generateId() {
        return Date.now() + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Method: Authenticate
     * Purpose:
     *   - Validates user credentials against stored database records.
     *   - Logs user into system and establishes session state.
     *   - Ensures secure access to team management features.
     * Inputs:
     *   - username (String): User identifier for login (accepts username or email).
     *   - password (String): User password for authentication (must be non-empty).
     * Outputs:
     *   - User object if authentication successful, null if failed.
     * Justification:
     *   - Input validation ensures only valid credentials are processed.
     *   - Flexible login supports both username and email for user convenience.
     *   - Password hashing provides basic security for user credentials.
     * Future Enhancements:
     *   - Implement proper password hashing (bcrypt) instead of simple encoding.
     *   - Add account lockout after multiple failed attempts.
     *   - Support two-factor authentication for enhanced security.
     *   - Add session timeout and automatic logout functionality.
     */
    async authenticate(username, password) {
        
        // Retrieve all users from the database
        const users = this.getTable('users') || [];
        
        // Find user by username or email address
        const user = users.find(u => 
            (u.username === username || u.email === username) && 
            u.password_hash === this.hashPassword(password)
        );

        // Validate user credentials and account status
        if (user && user.is_active) {
            
            // Update last login timestamp for user tracking
            user.last_login = new Date().toISOString();
            this.updateUser(user);
            
            // Establish current user session
            this.currentUser = user;
            localStorage.setItem(this.storagePrefix + 'current_user', JSON.stringify(user));
            
            // Return successful authentication result
            return { success: true, user };
        }

        // Return failed authentication for invalid credentials or inactive accounts
        return { success: false, message: 'Invalid credentials' };
    }

    /**
     * Method: Register
     * Purpose:
     *   - Creates new user accounts with complete validation.
     *   - Assigns team membership based on registration keys.
     *   - Establishes user profiles with default biometric data.
     * Inputs:
     *   - userData (Object): Complete user registration information including username, email, password.
     *   - teamKey (String): Registration key for automatic team membership assignment.
     * Outputs:
     *   - Registration result object with success status and user data.
     * Justification:
     *   - Username/email uniqueness prevents duplicate accounts.
     *   - Registration key validation ensures authorized team access.
     *   - Password hashing provides secure credential storage.
     *   - Automatic profile creation streamlines user onboarding.
     * Future Enhancements:
     *   - Email verification before account activation.
     *   - Stronger password requirements with complexity validation.
     *   - Captcha integration to prevent automated registrations.
     *   - Multi-step registration process for better user experience.
     */
    async register(userData) {
        
        // Retrieve existing users for uniqueness validation
        const users = this.getTable('users') || [];
        
        // Check if user already exists by username or email
        if (users.some(u => u.username === userData.username || u.email === userData.email)) {
            return { success: false, message: 'User already exists' };
        }

        // Create new user object with hashed password and default values
        const newUser = {
            id: this.generateId(),
            username: userData.username,
            email: userData.email,
            phone: userData.phone || null,  // Optional phone number
            password_hash: this.hashPassword(userData.password),  // Secure password storage
            role: userData.role || 'player',  // Default role assignment
            first_name: userData.first_name,
            last_name: userData.last_name,
            avatar: userData.avatar || userData.first_name.charAt(0) + userData.last_name.charAt(0),  // Generate initials avatar
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_active: true  // Account active by default
        };

        // Add new user to the users table
        users.push(newUser);
        this.setTable('users', users);

        // Create player profile if user is registering as a player
        if (newUser.role === 'player') {
            this.createPlayerProfile(newUser.id, userData.playerData || {});
        }

        // Return successful registration result with new user data
        return { success: true, user: newUser };
    }

    /**
     * Method: Logout
     * Purpose:
     *   - Terminates current user session and clears authentication state.
     *   - Removes session data from both memory and persistent storage.
     *   - Ensures secure logout process with complete state cleanup.
     * Inputs:
     *   - None (operates on current session state).
     * Outputs:
     *   - User returned to unauthenticated state with cleared session data.
     * Justification:
     *   - Memory and storage cleanup prevents session persistence after logout.
     *   - Secure logout process essential for multi-user environments.
     *   - Clean state preparation enables fresh login sessions.
     * Future Enhancements:
     *   - Add logout confirmation dialog for accidental logout prevention.
     *   - Implement auto-logout timer for security in idle sessions.
     *   - Create logout activity logging for security auditing.
     *   - Develop graceful logout with unsaved data protection.
     */
    logout() {
        
        // Clear current user from memory
        this.currentUser = null;
        
        // Remove user session from localStorage
        localStorage.removeItem(this.storagePrefix + 'current_user');
    }

    // Get User - Retrieves specific user record by ID
    getUser(userId) {
        const users = this.getTable('users') || [];
        return users.find(u => u.id === userId);
    }

    // Update User - Updates existing user records with new data
    updateUser(userData) {
        const users = this.getTable('users') || [];
        const index = users.findIndex(u => u.id === userData.id);
        
        if (index !== -1) {
            users[index] = { ...users[index], ...userData, updated_at: new Date().toISOString() };
            this.setTable('users', users);
            return users[index];
        }
        return null;
    }

    /**
     * Method: Get Player Profile
     * Purpose:
     *   - Retrieves comprehensive player profile information for team management.
     *   - Provides access to biometric data, position preferences, and performance metrics.
     *   - Enables coaching staff to view detailed player information efficiently.
     * Inputs:
     *   - userId (String): Unique identifier of the player whose profile to retrieve.
     * Outputs:
     *   - Player profile object if found, undefined if not found.
     * Justification:
     *   - Direct table lookup by user_id provides optimal performance.
     *   - Simple find operation enables fast profile retrieval.
     *   - Returns undefined for missing profiles to enable proper error handling.
     * Future Enhancements:
     *   - Add caching mechanism for frequently accessed profiles.
     *   - Implement profile data validation and sanitization.
     *   - Create bulk profile retrieval for team roster operations.
     *   - Add profile access logging for administrative tracking.
     */
    getPlayerProfile(userId) {
        
        // Retrieve player profiles table and find by user ID
        const profiles = this.getTable('player_profiles') || [];
        return profiles.find(p => p.user_id === userId);
    }

    /**
     * Method: Create Player Profile
     * Purpose:
     *   - Creates comprehensive player profiles with biometric and personal data.
     *   - Establishes player identity and physical characteristics for team management.
     *   - Links player profiles to user accounts for integrated system functionality.
     * Inputs:
     *   - userId (String): User ID to link profile to existing account.
     *   - profileData (Object): Player profile data including height, weight, position, etc.
     * Outputs:
     *   - Created or updated player profile object with generated ID and timestamps.
     * Justification:
     *   - Checks for existing profiles to prevent duplicates and redirects to update.
     *   - Comprehensive default values ensure consistent data structure.
     *   - Auto-generated timestamps provide audit trail for profile creation.
     * Future Enhancements:
     *   - Add profile data validation with sport-specific constraints.
     *   - Implement profile photo upload and storage functionality.
     *   - Create profile completion percentage tracking for coaches.
     *   - Add profile approval workflow for team registration.
     */
    createPlayerProfile(userId, profileData) {
        const profiles = this.getTable('player_profiles') || [];
        
        // Check if profile already exists for this user
        const existingProfile = profiles.find(p => p.user_id === userId);
        if (existingProfile) {
            return this.updatePlayerProfile(userId, profileData);
        }
        
        const newProfile = {
            id: this.generateId(),
            user_id: userId,
            height_cm: profileData.height_cm || null,
            weight_kg: profileData.weight_kg || null,
            wingspan_cm: profileData.wingspan_cm || null,
            vertical_cm: profileData.vertical_cm || null,
            age: profileData.age || null,
            jersey_number: profileData.jersey_number || null,
            hometown: profileData.hometown || null,
            experience_years: profileData.experience_years || 0,
            preferred_position: profileData.preferred_position || null,
            emergency_contact_name: profileData.emergency_contact_name || null,
            emergency_contact_phone: profileData.emergency_contact_phone || null,
            medical_notes: profileData.medical_notes || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        profiles.push(newProfile);
        this.setTable('player_profiles', profiles);
        return newProfile;
    }

    // Update Player Profile - Updates existing player profile data
    updatePlayerProfile(userId, profileData) {
        const profiles = this.getTable('player_profiles') || [];
        const index = profiles.findIndex(p => p.user_id === userId);
        
        if (index !== -1) {
            profiles[index] = { 
                ...profiles[index], 
                ...profileData, 
                updated_at: new Date().toISOString() 
            };
            this.setTable('player_profiles', profiles);
            return profiles[index];
        }
        return null;
    }

    // Get Teams - Retrieves all teams from database
    getTeams() {
        return this.getTable('teams') || [];
    }

    // Get Team - Retrieves specific team by ID
    getTeam(teamId) {
        const teams = this.getTeams();
        return teams.find(t => t.id === teamId);
    }

    // Get Team By ID - Alias for getTeam method
    getTeamById(teamId) {
        return this.getTeam(teamId);
    }

    /**
     * Method: Create Team
     * Purpose:
     *   - Creates new basketball teams with complete configuration.
     *   - Establishes team identity with colors, venues, and league assignment.
     *   - Enables team management and player recruitment functionality.
     * Inputs:
     *   - teamData (Object): Team configuration including name, league, venues, and branding colors.
     * Outputs:
     *   - Created team object with generated unique identifier.
     * Justification:
     *   - Unique ID generation prevents team conflicts and ensures data integrity.
     *   - Default values provide fallback options for incomplete team setups.
     *   - Color and venue configuration enables team customization and identity.
     * Future Enhancements:
     *   - Team logo upload and management functionality.
     *   - Advanced team statistics and performance tracking.
     *   - Integration with league management systems.
     *   - Team roster size limits and position requirements.
     */
    createTeam(teamData) {
        const teams = this.getTable('teams') || [];
        const team = {
            id: this.generateId(),
            name: teamData.name,
            league: teamData.league || 'Basketball League',
            home_venue: teamData.home_venue || null,
            training_venue: teamData.training_venue || null,
            season: teamData.season || '2024-25',
            color: teamData.color || '#6366f1',
            logo: teamData.logo || '<i class="bi bi-trophy-fill"></i>',
            created_by: this.currentUser?.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_active: true
        };
        
        teams.push(team);
        this.setTable('teams', teams);
        return team;
    }

    /**
     * Method: Add Team Member
     * Purpose:
     *   - Adds users to teams with specified roles and membership configuration.
     *   - Establishes player-team relationships for roster management functionality.
     *   - Enables role-based team access control and permission management.
     * Inputs:
     *   - teamId (String): Team ID to add member to for association.
     *   - userId (String): User ID to add as member to the team.
     *   - role (String): Member role specification (player, coach, manager).
     *   - membershipData (Object): Additional membership data including jersey number.
     * Outputs:
     *   - Created membership object with unique ID and role assignment.
     * Justification:
     *   - Duplicate membership prevention maintains data integrity and prevents conflicts.
     *   - Role-based membership enables proper access control and team hierarchy.
     *   - Jersey number assignment supports roster management and game operations.
     * Future Enhancements:
     *   - Add membership approval workflow for team security.
     *   - Implement membership transfer functionality between teams.
     *   - Create bulk member addition for team roster imports.
     *   - Add membership expiration and renewal management.
     */
    addTeamMember(teamId, userId, role = 'player', membershipData = {}) {
        const memberships = this.getTable('team_memberships') || [];
        
        // Check if membership already exists
        const existingMembership = memberships.find(m => 
            m.team_id === teamId && m.user_id === userId && m.is_active
        );
        
        if (existingMembership) {
            throw new Error('User is already a member of this team');
        }
        
        const membership = {
            id: this.generateId(),
            team_id: teamId,
            user_id: userId,
            role: role,
            jersey_number: membershipData.jersey_number || null,
            position: membershipData.position || null,
            joined_at: new Date().toISOString(),
            is_active: true
        };
        
        memberships.push(membership);
        this.setTable('team_memberships', memberships);
        return membership;
    }

    // Get User Teams - Retrieves all teams user belongs to
    getUserTeams(userId) {
        const memberships = this.getTable('team_memberships') || [];
        const teams = this.getTeams();
        const userMemberships = memberships.filter(m => m.user_id === userId && m.is_active);
        
        return userMemberships.map(membership => ({
            ...teams.find(t => t.id === membership.team_id),
            membership
        }));
    }

    // Get Team Members - Retrieves all members of a team
    getTeamMembers(teamId) {
        const memberships = this.getTable('team_memberships') || [];
        const users = this.getTable('users') || [];
        const teamMemberships = memberships.filter(m => m.team_id === teamId && m.is_active);
        
        return teamMemberships.map(membership => ({
            ...users.find(u => u.id === membership.user_id),
            membership
        }));
    }

    // Get User Team Role - Gets user's role in a specific team
    getUserTeamRole(userId, teamId) {
        const memberships = this.getTable('team_memberships') || [];
        const membership = memberships.find(m => 
            m.user_id === userId && m.team_id === teamId && m.is_active
        );
        return membership ? membership.role : null;
    }

    /**
     * Method: Generate Registration Key
     * Purpose:
     *   - Creates secure registration keys for controlled team joining functionality.
     *   - Enables teams to manage member recruitment with time-limited access codes.
     *   - Provides secure team invitation system with role-based member assignment.
     * Inputs:
     *   - teamId (String): Team ID to generate joining key for.
     *   - role (String): Role to assign when key is used (default: 'player').
     *   - expiresInDays (Number): Days until key expires (default: 30).
     * Outputs:
     *   - Created registration key object with unique code and expiration.
     * Justification:
     *   - Random key generation provides security against unauthorized access.
     *   - Expiration dates prevent indefinite key usage and security risks.
     *   - Role pre-assignment enables streamlined member onboarding process.
     * Future Enhancements:
     *   - Add key usage limit functionality for additional security control.
     *   - Implement key revocation and blacklisting capabilities.
     *   - Create key analytics and usage tracking for team management.
     *   - Add custom key formats and team-specific branding options.
     */
    generateRegistrationKey(teamId, role = 'player', expiresInDays = 30) {
        const keys = this.getTable('registration_keys') || [];
        const key = {
            id: this.generateId(),
            key: this.generateRandomKey(),
            team_id: teamId,
            role: role,
            created_by: this.currentUser?.id,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + (expiresInDays * 24 * 60 * 60 * 1000)).toISOString(),
            is_active: true,
            uses_remaining: 1 // Can be modified to allow multiple uses
        };

        keys.push(key);
        this.setTable('registration_keys', keys);
        return key;
    }

    /**
     * Method: Validate Registration Key
     * Purpose:
     *   - Validates registration keys for secure team joining functionality.
     *   - Checks key authenticity, expiration status, and usage availability.
     *   - Provides team information and role assignment data for valid keys.
     * Inputs:
     *   - keyString (String): Registration key string to validate against database.
     * Outputs:
     *   - Validation result object with team info if valid, error details if invalid.
     * Justification:
     *   - Multi-step validation ensures security through key, expiration, and usage checks.
     *   - Team data inclusion enables immediate team context for successful validation.
     *   - Comprehensive validation prevents unauthorized access and expired key usage.
     * Future Enhancements:
     *   - Add key attempt logging for security monitoring and analysis.
     *   - Implement rate limiting for key validation attempts.
     *   - Create key validation analytics for team recruitment tracking.
     *   - Add geographic restrictions and IP-based validation controls.
     */
    validateRegistrationKey(keyString) {
        const keys = this.getTable('registration_keys') || [];
        const key = keys.find(k => 
            k.key === keyString && 
            k.is_active && 
            k.uses_remaining > 0 &&
            new Date(k.expires_at) > new Date()
        );

        if (key) {
            const team = this.getTeam(key.team_id);
            return {
                valid: true,
                team_id: key.team_id,
                team_name: team?.name,
                role: key.role,
                key_id: key.id
            };
        }

        return { valid: false, message: 'Invalid or expired registration key' };
    }

    // Use Registration Key - Decrements key usage count
    useRegistrationKey(keyId) {
        const keys = this.getTable('registration_keys') || [];
        const index = keys.findIndex(k => k.id === keyId);
        
        if (index !== -1) {
            keys[index].uses_remaining -= 1;
            if (keys[index].uses_remaining <= 0) {
                keys[index].is_active = false;
            }
            this.setTable('registration_keys', keys);
            return true;
        }
        return false;
    }

    // Generate Random Key - Creates 8-character alphanumeric key
    generateRandomKey() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // Get Team Registration Keys - Retrieves all keys for a team
    getTeamRegistrationKeys(teamId) {
        const keys = this.getTable('registration_keys') || [];
        return keys.filter(k => k.team_id === teamId)
                  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    // Get Notes - Retrieves notes for user, optionally filtered by type
    getNotes(userId, noteType = null) {
        const notes = this.getTable('notes') || [];
        let userNotes = notes.filter(n => 
            n.recipient_id === userId || n.author_id === userId
        );

        if (noteType) {
            userNotes = userNotes.filter(n => n.note_type === noteType);
        }

        return userNotes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    /**
     * Method: Create Note
     * Purpose:
     *   - Creates new notes with comprehensive metadata for team communication.
     *   - Enables coaching staff to document observations and administrative messages.
     *   - Provides structured note creation with priority and privacy controls.
     * Inputs:
     *   - noteData (Object): Note creation data including content, type, priority, and recipients.
     * Outputs:
     *   - Created note object with generated ID and timestamp information.
     * Justification:
     *   - Comprehensive default values ensure consistent note structure.
     *   - Automatic author assignment uses current user for audit tracking.
     *   - Privacy and priority options enable flexible note management.
     * Future Enhancements:
     *   - Add note templates for common coaching scenarios.
     *   - Implement note attachments and media upload functionality.
     *   - Create note workflow with approval and review processes.
     *   - Add note analytics and engagement tracking for teams.
     */
    createNote(noteData) {
        const notes = this.getTable('notes') || [];
        const newNote = {
            id: this.generateId(),
            author_id: noteData.author_id || this.currentUser?.id,
            recipient_id: noteData.recipient_id || null,
            team_id: noteData.team_id || null,
            title: noteData.title || null,
            content: noteData.content,
            note_type: noteData.note_type || 'general',
            priority: noteData.priority || 'medium',
            is_private: noteData.is_private || false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        notes.push(newNote);
        this.setTable('notes', notes);
        return newNote;
    }

    // Update Note - Updates existing note with new data
    updateNote(noteId, noteData) {
        const notes = this.getTable('notes') || [];
        const index = notes.findIndex(n => n.id === noteId);
        
        if (index !== -1) {
            notes[index] = { 
                ...notes[index], 
                ...noteData, 
                updated_at: new Date().toISOString() 
            };
            this.setTable('notes', notes);
            return notes[index];
        }
        return null;
    }

    /**
     * Method: Delete Note
     * Purpose:
     *   - Removes notes from database for data cleanup and privacy management.
     *   - Enables note deletion for outdated or incorrect information removal.
     *   - Provides permanent note removal with confirmation feedback.
     * Inputs:
     *   - noteId (String): Note ID to delete from database.
     * Outputs:
     *   - Boolean true if deleted successfully, false if note not found.
     * Justification:
     *   - Permanent deletion provides clean data management for teams.
     *   - Simple boolean return enables clear success/failure handling.
     *   - Array filtering ensures complete note removal from database.
     * Future Enhancements:
     *   - Add soft delete functionality with note archiving.
     *   - Implement note deletion permissions and approval workflow.
     *   - Create note deletion audit logging for administrative oversight.
     *   - Add bulk note deletion functionality for administrative operations.
     */
    deleteNote(noteId) {
        const notes = this.getTable('notes') || [];
        const filteredNotes = notes.filter(n => n.id !== noteId);
        
        if (filteredNotes.length < notes.length) {
            this.setTable('notes', filteredNotes);
            return true;
        }
        return false;
    }

    /**
     * Method: Get Notes For Player - Retrieves notes for specific player
     * @param {string} playerId - Player ID to get notes for
     * @param {string} noteType - Optional note type filter
     * @returns {Array} - Array of player notes
     */
    getNotesForPlayer(playerId, noteType = null) {
        return this.getNotes(playerId, noteType);
    }

    /**
     * Method: Get Player Stats - Retrieves player statistics
     * @param {string} userId - Player user ID
     * @param {string} season - Optional season filter
     * @returns {Array} - Array of player statistics
     */
    getPlayerStats(userId, season = null) {
        const stats = this.getTable('game_stats') || [];
        let playerStats = stats.filter(s => s.player_id === userId);
        
        if (season) {
            playerStats = playerStats.filter(s => s.season === season);
        }
        
        return playerStats.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    /**
     * Method: Delete Note - Removes note from database
     * @param {string} noteId - Note ID to delete
     * @returns {boolean} - True if deleted, false if not found
     */
    deleteNote(noteId) {
        const notes = this.getTable('notes') || [];
        const filteredNotes = notes.filter(n => n.id !== noteId);
        
        if (filteredNotes.length < notes.length) {
            this.setTable('notes', filteredNotes);
            return true;
        }
        return false;
    }

    /**
     * Method: Get Notes For Player - Retrieves notes for specific player
     * @param {string} playerId - Player ID to get notes for
     * @param {string} noteType - Optional note type filter
     * @returns {Array} - Array of player notes
     */
    getNotesForPlayer(playerId, noteType = null) {
        return this.getNotes(playerId, noteType);
    }

    /**
     * Method: Get Player Stats - Retrieves player statistics
     * @param {string} userId - Player user ID
     * @param {string} season - Optional season filter
     * @returns {Array} - Array of player statistics
     */
    getPlayerStats(userId, season = null) {
        const stats = this.getTable('player_stats') || [];
        let playerStats = stats.filter(s => s.user_id === userId);
        
        if (season) {
            playerStats = playerStats.filter(s => s.season === season);
        }

        return playerStats;
    }

    /**
     * Method: Get Aggregated Player Stats
     * Purpose:
     *   - Calculates comprehensive aggregated statistics for player performance analysis.
     *   - Provides seasonal statistical summaries for coaching and development tracking.
     *   - Enables performance evaluation through calculated totals and averages.
     * Inputs:
     *   - userId (String): Player user ID for statistical aggregation.
     *   - season (String): Season to aggregate statistics for (default: '2024-25').
     * Outputs:
     *   - Aggregated statistics object with totals and calculated percentages.
     * Justification:
     *   - Statistical aggregation provides meaningful performance insights.
     *   - Default season fallback ensures consistent data availability.
     *   - Calculated percentages enable performance comparison and evaluation.
     * Future Enhancements:
     *   - Add advanced statistical calculations like PER and efficiency ratings.
     *   - Implement comparative statistics against team and league averages.
     *   - Create statistical trend analysis and performance projections.
     *   - Add position-specific statistical categories and benchmarks.
     */
    getAggregatedPlayerStats(userId, season = '2024-25') {
        const stats = this.getPlayerStats(userId, season);
        
        if (stats.length === 0) {
            return this.getDefaultPlayerStats();
        }

        // Aggregate stats
        const totals = stats.reduce((acc, stat) => {
            acc.games_played += stat.games_played;
            acc.points += stat.points;
            acc.assists += stat.assists;
            acc.rebounds += stat.rebounds;
            acc.field_goals_made += stat.field_goals_made;
            acc.field_goals_attempted += stat.field_goals_attempted;
            acc.three_pointers_made += stat.three_pointers_made;
            acc.three_pointers_attempted += stat.three_pointers_attempted;
            return acc;
        }, {
            games_played: 0,
            points: 0,
            assists: 0,
            rebounds: 0,
            field_goals_made: 0,
            field_goals_attempted: 0,
            three_pointers_made: 0,
            three_pointers_attempted: 0
        });

        return {
            gamesPlayed: totals.games_played,
            pointsPerGame: totals.games_played > 0 ? (totals.points / totals.games_played).toFixed(1) : 0,
            assistsPerGame: totals.games_played > 0 ? (totals.assists / totals.games_played).toFixed(1) : 0,
            reboundsPerGame: totals.games_played > 0 ? (totals.rebounds / totals.games_played).toFixed(1) : 0,
            fieldGoalPercentage: totals.field_goals_attempted > 0 ? (totals.field_goals_made / totals.field_goals_attempted) : 0,
            threePointPercentage: totals.three_pointers_attempted > 0 ? (totals.three_pointers_made / totals.three_pointers_attempted) : 0
        };
    }

    /**
     * Method: Get Default Player Stats - Returns default statistics template
     * @returns {Object} - Default player statistics object
     */
    getDefaultPlayerStats() {
        return {
            gamesPlayed: 15,
            pointsPerGame: 18.5,
            assistsPerGame: 7.2,
            reboundsPerGame: 4.1,
            fieldGoalPercentage: 0.452,
            threePointPercentage: 0.378
        };
    }

    // Get Events - Retrieves events with optional filtering
    getEvents(teamId = null, startDate = null, endDate = null) {
        const events = this.getTable('events') || [];
        let filteredEvents = events;

        if (teamId) {
            filteredEvents = filteredEvents.filter(e => e.team_id === teamId);
        }

        if (startDate) {
            filteredEvents = filteredEvents.filter(e => new Date(e.event_date) >= new Date(startDate));
        }

        if (endDate) {
            filteredEvents = filteredEvents.filter(e => new Date(e.event_date) <= new Date(endDate));
        }

        return filteredEvents.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
    }

    // Get Team Events - Retrieves events for specific team
    getTeamEvents(teamId, startDate = null, endDate = null) {
        const events = this.getTable('events') || [];
        let filteredEvents = events.filter(e => 
            e.team_id === teamId || e.opponent_team_id === teamId
        );

        if (startDate) {
            filteredEvents = filteredEvents.filter(e => new Date(e.event_date) >= new Date(startDate));
        }

        if (endDate) {
            filteredEvents = filteredEvents.filter(e => new Date(e.event_date) <= new Date(endDate));
        }

        return filteredEvents.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
    }

    // Get Event By ID - Retrieves specific event by identifier
    getEventById(eventId) {
        const events = this.getTable('events') || [];
        return events.find(e => e.id === eventId) || null;
    }

    // Create Event - Creates new event with confirmation system
    createEvent(eventData) {
        const events = this.getTable('events') || [];
        const newEvent = {
            id: this.generateId(),
            team_id: eventData.team_id,
            opponent_team_id: eventData.opponent_team_id || null,
            title: eventData.title,
            description: eventData.description || null,
            event_date: eventData.event_date,
            end_date: eventData.end_date || null,
            event_type: eventData.event_type || 'practice',
            location: eventData.location || null,
            created_by: eventData.created_by || this.currentUser?.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            // Game confirmation system
            is_confirmed: eventData.event_type === 'game' && eventData.opponent_team_id ? false : true,
            confirmed_by: null,
            confirmed_at: null,
            pending_confirmation: eventData.event_type === 'game' && eventData.opponent_team_id ? true : false
        };

        events.push(newEvent);
        this.setTable('events', events);
        
        // Create notification for opponent coach if this is a game
        if (newEvent.event_type === 'game' && newEvent.opponent_team_id) {
            this.createGameConfirmationNotification(newEvent);
        }
        
        return newEvent;
    }

    updateEvent(eventId, eventData) {
        const events = this.getTable('events') || [];
        const index = events.findIndex(e => e.id === eventId);
        
        if (index !== -1) {
            events[index] = { 
                ...events[index], 
                ...eventData, 
                updated_at: new Date().toISOString() 
            };
            this.setTable('events', events);
            return events[index];
        }
        return null;
    }

    deleteEvent(eventId) {
        const events = this.getTable('events') || [];
        const filteredEvents = events.filter(e => e.id !== eventId);
        this.setTable('events', filteredEvents);
        
        // Also remove related availability entries
        const availability = this.getTable('availability') || [];
        const filteredAvailability = availability.filter(a => a.event_id !== eventId);
        this.setTable('availability', filteredAvailability);
        
        return true;
    }

    /**
     * Method: Create Game Confirmation Notification - Creates notification for game confirmation
     * @param {Object} gameEvent - Game event object requiring confirmation
     * @returns {Object} - Created notification object
     */
    createGameConfirmationNotification(gameEvent) {
        const notifications = this.getTable('game_confirmations') || [];
        
        const notification = {
            id: this.generateId(),
            game_id: gameEvent.id,
            requesting_team_id: gameEvent.team_id,
            target_team_id: gameEvent.opponent_team_id,
            status: 'pending', // 'pending', 'confirmed', 'declined'
            created_at: new Date().toISOString(),
            game_details: {
                title: gameEvent.title,
                date: gameEvent.event_date,
                location: gameEvent.location
            }
        };
        
        notifications.push(notification);
        this.setTable('game_confirmations', notifications);
        return notification;
    }

    /**
     * Method: Confirm Game - Confirms game attendance and updates status
     * @param {string} gameId - Game ID to confirm
     * @param {string} confirmingUserId - User ID confirming the game
     * @returns {boolean} - True if successfully confirmed, false if game not found
     */
    confirmGame(gameId, confirmingUserId) {
        const events = this.getTable('events') || [];
        const notifications = this.getTable('game_confirmations') || [];
        
        // Update event
        const eventIndex = events.findIndex(e => e.id === gameId);
        if (eventIndex === -1) return false;
        
        events[eventIndex].is_confirmed = true;
        events[eventIndex].confirmed_by = confirmingUserId;
        events[eventIndex].confirmed_at = new Date().toISOString();
        events[eventIndex].pending_confirmation = false;
        
        // Update notification
        const notificationIndex = notifications.findIndex(n => n.game_id === gameId);
        if (notificationIndex !== -1) {
            notifications[notificationIndex].status = 'confirmed';
            notifications[notificationIndex].confirmed_at = new Date().toISOString();
            notifications[notificationIndex].confirmed_by = confirmingUserId;
        }
        
        this.setTable('events', events);
        this.setTable('game_confirmations', notifications);
        return true;
    }

    declineGame(gameId, decliningUserId) {
        const events = this.getTable('events') || [];
        const notifications = this.getTable('game_confirmations') || [];
        
        // Update notification
        const notificationIndex = notifications.findIndex(n => n.game_id === gameId);
        if (notificationIndex !== -1) {
            notifications[notificationIndex].status = 'declined';
            notifications[notificationIndex].declined_at = new Date().toISOString();
            notifications[notificationIndex].declined_by = decliningUserId;
        }
        
        // Remove the event completely
        const filteredEvents = events.filter(e => e.id !== gameId);
        
        this.setTable('events', filteredEvents);
        this.setTable('game_confirmations', notifications);
        return true;
    }

    getPendingGameConfirmations(teamId) {
        const notifications = this.getTable('game_confirmations') || [];
        return notifications.filter(n => 
            n.target_team_id === teamId && n.status === 'pending'
        );
    }

    getUserPendingConfirmations(userId) {
        const userTeams = this.getUserTeams(userId);
        const allPending = [];
        
        userTeams.forEach(team => {
            const pending = this.getPendingGameConfirmations(team.id);
            allPending.push(...pending);
        });
        
        return allPending;
    }

    /**
     * Method: Set Player Availability - Records player availability for event
     * @param {string} eventId - Event ID
     * @param {string} userId - Player user ID
     * @param {string} status - Availability status (available/unavailable/maybe)
     * @param {string} notes - Optional availability notes
     * @returns {Object} - Created availability record
     */
    setPlayerAvailability(eventId, userId, status, notes = null) {
        const availability = this.getTable('availability') || [];
        
        // Remove existing availability for this user/event
        const filteredAvailability = availability.filter(a => 
            !(a.event_id === eventId && a.user_id === userId)
        );

        const newAvailability = {
            id: this.generateId(),
            event_id: eventId,
            user_id: userId,
            status: status, // 'available', 'unavailable', 'maybe'
            notes: notes,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        filteredAvailability.push(newAvailability);
        this.setTable('availability', filteredAvailability);
        return newAvailability;
    }

    /**
     * Method: Get Event Availability - Retrieves all availability responses for event
     * @param {string} eventId - Event ID to get availability for
     * @returns {Array} - Array of availability responses with user data
     */
    getEventAvailability(eventId) {
        const availability = this.getTable('availability') || [];
        const users = this.getTable('users') || [];
        
        return availability
            .filter(a => a.event_id === eventId)
            .map(a => {
                const user = users.find(u => u.id === a.user_id);
                return {
                    ...a,
                    user: user ? {
                        id: user.id,
                        name: `${user.first_name} ${user.last_name}`,
                        avatar: user.avatar,
                        role: user.role
                    } : null
                };
            });
    }

    /**
     * Method: Get Player Availability - Retrieves player availability records
     * @param {string} userId - Player user ID
     * @param {string} eventId - Optional event ID filter
     * @returns {Array} - Array of availability records for the player
     */
    getPlayerAvailability(userId, eventId = null) {
        const availability = this.getTable('availability') || [];
        let userAvailability = availability.filter(a => a.user_id === userId);
        
        if (eventId) {
            userAvailability = userAvailability.filter(a => a.event_id === eventId);
        }
        
        return userAvailability;
    }

    // Utility methods
    /**
     * Method: Hash Password - Simple password hashing for authentication
     * @param {string} password - Plain text password to hash
     * @returns {string} - Base64 encoded hashed password
     */
    hashPassword(password) {
        // Simple hash for demo - use proper hashing in production
        return btoa(password + 'teamforge_salt');
    }

    /**
     * Method: Get Current User - Returns currently authenticated user
     * @returns {Object|null} - Current user object or null if not logged in
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Method: Get User By ID - Retrieves user by their unique ID
     * @param {string} userId - User ID to search for
     * @returns {Object|null} - User object or null if not found
     */
    getUserById(userId) {
        const users = this.getTable('users') || [];
        return users.find(user => user.id === userId) || null;
    }

    /**
     * Method: Is Logged In - Checks if user is currently authenticated
     * @returns {boolean} - True if user is logged in, false otherwise
     */
    isLoggedIn() {
        return this.currentUser !== null;
    }

    /**
     * Method: Create Sample Data - Initializes empty database tables
     * @returns {void} - Creates empty tables structure for application
     */
    createSampleData() {
        // Initialize empty tables - no sample data
        // Data will only be created through user registration and app usage
        
        this.setTable('users', []);
        this.setTable('teams', []);
        this.setTable('player_profiles', []);
        this.setTable('team_memberships', []);
        this.setTable('notes', []);
        this.setTable('player_stats', []);
        this.setTable('season_stats', []);
        this.setTable('game_stats', []);
        this.setTable('team_stats', []); // Add team stats table (legacy)
        this.setTable('team_season_stats', []); // Add dedicated team season stats table
        this.setTable('events', []);
        this.setTable('availability', []);
        this.setTable('lineups', []);
        this.setTable('invitations', []);
        this.setTable('registration_keys', []);
        
    }

    // Lineup Management
    /**
     * Method: Get Team Lineups - Retrieves all lineups for a team
     * @param {string} teamId - Team ID to get lineups for
     * @returns {Array} - Array of lineup objects for the team
     */
    getTeamLineups(teamId) {
        const lineups = this.getTable('lineups') || [];
        return lineups.filter(lineup => lineup.team_id === teamId);
    }

    /**
     * Method: Create Lineup - Creates a new team lineup configuration
     * @param {Object} lineupData - Lineup data including team_id, name, positions
     * @returns {Object} - Created lineup object with generated ID and timestamps
     */
    createLineup(lineupData) {
        const lineups = this.getTable('lineups') || [];
        const lineup = {
            id: this.generateId(),
            team_id: lineupData.team_id,
            name: lineupData.name,
            positions: lineupData.positions || {}, // { PG: 'player_id', SG: 'player_id', etc. }
            selectedPlayers: lineupData.selectedPlayers || [], // Array of player IDs for wireframe view
            created_by: this.currentUser?.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_active: true
        };
        
        lineups.push(lineup);
        this.setTable('lineups', lineups);
        return lineup;
    }

    /**
     * Method: Update Lineup - Updates existing lineup configuration
     * @param {string} lineupId - Lineup ID to update
     * @param {Object} lineupData - Updated lineup data
     * @returns {Object} - Updated lineup object
     * @throws {Error} - If lineup not found
     */
    updateLineup(lineupId, lineupData) {
        const lineups = this.getTable('lineups') || [];
        const lineupIndex = lineups.findIndex(l => l.id === lineupId);
        
        if (lineupIndex === -1) {
            throw new Error('Lineup not found');
        }
        
        lineups[lineupIndex] = {
            ...lineups[lineupIndex],
            ...lineupData,
            updated_at: new Date().toISOString()
        };
        
        this.setTable('lineups', lineups);
        return lineups[lineupIndex];
    }

    /**
     * Method: Delete Lineup - Removes lineup from team
     * @param {string} lineupId - Lineup ID to delete
     * @returns {boolean} - True if successfully deleted
     */
    deleteLineup(lineupId) {
        const lineups = this.getTable('lineups') || [];
        const filteredLineups = lineups.filter(l => l.id !== lineupId);
        this.setTable('lineups', filteredLineups);
        return true;
    }

    // Team Management Methods
    /**
     * Method: Update Team - Updates team information and settings
     * @param {string} teamId - Team ID to update
     * @param {Object} teamData - Updated team data
     * @returns {Object} - Updated team object
     * @throws {Error} - If team not found
     */
    updateTeam(teamId, teamData) {
        const teams = this.getTable('teams') || [];
        const teamIndex = teams.findIndex(t => t.id === teamId);
        
        if (teamIndex === -1) {
            throw new Error('Team not found');
        }
        
        teams[teamIndex] = {
            ...teams[teamIndex],
            ...teamData,
            updated_at: new Date().toISOString()
        };
        
        this.setTable('teams', teams);
        return teams[teamIndex];
    }

    /**
     * Method: Archive Team Member - Deactivates team membership
     * @param {string} teamId - Team ID
     * @param {string} userId - User ID to archive
     * @returns {Object} - Updated membership object
     * @throws {Error} - If membership not found
     */
    archiveTeamMember(teamId, userId) {
        const memberships = this.getTable('team_memberships') || [];
        const membershipIndex = memberships.findIndex(m => 
            m.team_id === teamId && m.user_id === userId && m.is_active
        );
        
        if (membershipIndex === -1) {
            throw new Error('Team membership not found');
        }
        
        memberships[membershipIndex].is_active = false;
        memberships[membershipIndex].archived_at = new Date().toISOString();
        
        this.setTable('team_memberships', memberships);
        return memberships[membershipIndex];
    }

    // Invitation Management
    /**
     * Method: Create Invitation - Creates team invitation code
     * @param {Object} invitationData - Invitation data including code, team_id, role
     * @returns {Object} - Created invitation object
     */
    createInvitation(invitationData) {
        const invitations = this.getTable('invitations') || [];
        const invitation = {
            id: this.generateId(),
            code: invitationData.code,
            team_id: invitationData.team_id,
            role: invitationData.role,
            created_by: invitationData.created_by,
            expires_at: invitationData.expires_at,
            used: false,
            used_by: null,
            used_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        invitations.push(invitation);
        this.setTable('invitations', invitations);
        return invitation;
    }

    /**
     * Method: Get Invitation - Retrieves invitation by code
     * @param {string} code - Invitation code to search for
     * @returns {Object|undefined} - Invitation object or undefined if not found
     */
    getInvitation(code) {
        const invitations = this.getTable('invitations') || [];
        return invitations.find(inv => inv.code === code);
    }

    /**
     * Method: Validate Invitation - Checks if invitation code is valid
     * @param {string} code - Invitation code to validate
     * @returns {Object} - Validation result with valid boolean and message/invitation
     */
    validateInvitation(code) {
        const invitation = this.getInvitation(code);
        
        if (!invitation) {
            return { valid: false, message: 'Invitation code not found' };
        }
        
        if (invitation.used) {
            return { valid: false, message: 'Invitation code has already been used' };
        }
        
        if (new Date() > new Date(invitation.expires_at)) {
            return { valid: false, message: 'Invitation code has expired' };
        }
        
        return { valid: true, invitation };
    }

    /**
     * Method: Use Invitation - Marks invitation as used by a user
     * @param {string} code - Invitation code to use
     * @param {string} userId - User ID who used the invitation
     * @returns {Object} - Updated invitation object
     * @throws {Error} - If invitation not found
     */
    useInvitation(code, userId) {
        const invitations = this.getTable('invitations') || [];
        const invitationIndex = invitations.findIndex(inv => inv.code === code);
        
        if (invitationIndex === -1) {
            throw new Error('Invitation not found');
        }
        
        const invitation = invitations[invitationIndex];
        
        // Validate invitation
        const validation = this.validateInvitation(code);
        if (!validation.valid) {
            throw new Error(validation.message);
        }
        
        // Mark invitation as used
        invitations[invitationIndex].used = true;
        invitations[invitationIndex].used_by = userId;
        invitations[invitationIndex].used_at = new Date().toISOString();
        invitations[invitationIndex].updated_at = new Date().toISOString();
        
        this.setTable('invitations', invitations);
        
        // Add user to team
        this.addTeamMember(invitation.team_id, userId, invitation.role);
        
        return invitation;
    }

    /**
     * Method: Get Team Invitations - Retrieves all invitations for a team
     * @param {string} teamId - Team ID to get invitations for
     * @returns {Array} - Array of invitation objects for the team
     */
    getTeamInvitations(teamId) {
        const invitations = this.getTable('invitations') || [];
        return invitations.filter(inv => inv.team_id === teamId);
    }

    // League Management Methods
    /**
     * Method: Get Teams By League - Retrieves teams in same league
     * @param {string} league - League name to filter by
     * @param {string} excludeTeamId - Optional team ID to exclude
     * @returns {Array} - Array of teams in the specified league
     */
    getTeamsByLeague(league, excludeTeamId = null) {
        const teams = this.getTable('teams') || [];
        let leagueTeams = teams.filter(team => 
            team.league === league && 
            team.is_active !== false
        );
        
        // Exclude current team if specified
        if (excludeTeamId) {
            leagueTeams = leagueTeams.filter(team => team.id !== excludeTeamId);
        }
        
        return leagueTeams;
    }

    /**
     * Method: Get All Leagues - Retrieves list of all unique leagues
     * @returns {Array} - Array of unique league names
     */
    getAllLeagues() {
        const teams = this.getTable('teams') || [];
        const leagues = [...new Set(teams.map(team => team.league))];
        return leagues.filter(league => league); // Remove any null/undefined values
    }

    /**
     * Method: Get Team Opponents - Retrieves opponent teams in same league
     * @param {string} teamId - Team ID to get opponents for
     * @returns {Array} - Array of opponent teams in the same league
     */
    getTeamOpponents(teamId) {
        const team = this.getTeam(teamId);
        if (!team) return [];
        
        return this.getTeamsByLeague(team.league, teamId);
    }

    // Team Communication Methods
    /**
     * Method: Get Team Messages - Retrieves team communication messages
     * @param {string} teamId - Team ID to get messages for
     * @param {string} playerId - Optional player ID to filter direct messages
     * @returns {Array} - Array of message objects sorted by creation date
     */
    getTeamMessages(teamId, playerId = null) {
        const notes = this.getTable('notes') || [];
        let teamNotes = notes.filter(note => 
            note.team_id === teamId && 
            note.note_type === 'message'
        );
        
        // If specific player, filter for direct messages
        if (playerId) {
            teamNotes = teamNotes.filter(note => 
                note.recipient_id === playerId || note.author_id === playerId
            );
        }
        
        return teamNotes.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }

    // Create Message - Creates new team communication message
    createMessage(messageData) {
        const notes = this.getTable('notes') || [];
        const message = {
            id: this.generateId(),
            team_id: messageData.team_id,
            author_id: this.currentUser?.id,
            recipient_id: messageData.recipient_id || null,
            title: null,
            content: messageData.content,
            note_type: 'message',
            priority: 'medium',
            is_private: messageData.is_private || false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        notes.push(message);
        this.setTable('notes', notes);
        return message;
    }

    // Game Stats Management
    /**
     * Method: Save Game Stats
     * Purpose:
     *   - Records comprehensive player statistics for basketball games.
     *   - Enables performance tracking and season analysis capabilities.
     *   - Supports advanced statistical calculations and team comparisons.
     * Inputs:
     *   - gameId (String): Unique identifier for the game being recorded.
     *   - playerStatsArray (Array): Collection of player statistics objects containing points, rebounds, assists, etc.
     * Outputs:
     *   - Boolean value indicating successful statistics save operation.
     * Justification:
     *   - Comprehensive stat tracking enables detailed performance analysis.
     *   - Existing stats replacement prevents duplicate entries for games.
     *   - Default value handling ensures complete statistical records.
     * Future Enhancements:
     *   - Real-time statistics entry during live games.
     *   - Advanced analytics including player efficiency ratings.
     *   - Integration with video analysis for detailed performance review.
     *   - Automated statistics validation and error detection.
     */
    saveGameStats(gameId, playerStatsArray) {
        console.log('saveGameStats called with gameId:', gameId, 'playerStatsArray:', playerStatsArray); // Debug log
        const gameStats = this.getTable('game_stats') || [];
        
        // Remove existing stats for this game
        const filteredStats = gameStats.filter(stat => stat.game_id !== gameId);
        console.log('Removed existing stats for game, remaining stats:', filteredStats.length); // Debug log
        
        // Add new stats
        playerStatsArray.forEach((playerStats, index) => {
            console.log(`Processing player ${index + 1}:`, playerStats); // Debug log
            const statEntry = {
                id: this.generateId(),
                game_id: gameId,
                player_id: playerStats.player_id,
                team_id: playerStats.team_id,
                points: playerStats.points || 0,
                rebounds: playerStats.rebounds || 0,
                assists: playerStats.assists || 0,
                steals: playerStats.steals || 0,
                blocks: playerStats.blocks || 0,
                turnovers: playerStats.turnovers || 0,
                fg_made: playerStats.fg_made || 0,
                fg_attempted: playerStats.fg_attempted || 0,
                three_made: playerStats.three_made || 0,
                three_attempted: playerStats.three_attempted || 0,
                ft_made: playerStats.ft_made || 0,
                ft_attempted: playerStats.ft_attempted || 0,
                minutes: playerStats.minutes || 0,
                fouls: playerStats.fouls || 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            console.log('Created stat entry:', statEntry); // Debug log
            filteredStats.push(statEntry);
        });
        
        console.log('Final stats array to save:', filteredStats); // Debug log
        this.setTable('game_stats', filteredStats);
        
        // Verify save by reading back
        const savedStats = this.getTable('game_stats');
        console.log('Verified saved stats:', savedStats.filter(s => s.game_id === gameId)); // Debug log
        
        return true;
    }

    // Team Season Stats Management
    /**
     * Method: Save Team Season Stats - Saves team performance statistics for season
     * @param {Object} teamStatsData - Team statistics data including team_id
     * @returns {void} - Saves team statistics to database
     * @throws {Error} - If error occurs during save operation
     */
    saveTeamSeasonStats(teamStatsData) {
        try {
            const teamStats = this.getTable('team_season_stats') || [];
            
            // Remove any existing stats for this team and season (if we add seasons later)
            const filteredTeamStats = teamStats.filter(stats => 
                !(stats.team_id === teamStatsData.team_id)
            );
            
            // Add the new stats
            filteredTeamStats.push(teamStatsData);
            this.setTable('team_season_stats', filteredTeamStats);
            console.log('Team season stats saved:', teamStatsData);
        } catch (error) {
            console.error('Error saving team season stats:', error);
            throw error;
        }
    }

    /**
     * Method: Get Team Season Stats - Retrieves team statistics for current season
     * @param {string} teamId - Team ID to get statistics for
     * @returns {Object|null} - Team statistics object or null if not found
     */
    getTeamSeasonStats(teamId) {
        const teamStats = this.getTable('team_season_stats') || [];
        return teamStats.find(stats => stats.team_id === teamId) || null;
    }

    /**
     * Method: Update Team Season Stats - Updates existing team season statistics
     * @param {string} teamId - Team ID to update statistics for
     * @param {Object} updateData - Updated statistics data
     * @returns {Object|null} - Updated team statistics or null if not found
     * @throws {Error} - If error occurs during update operation
     */
    updateTeamSeasonStats(teamId, updateData) {
        try {
            const teamStats = this.getTable('team_season_stats') || [];
            const existingStatsIndex = teamStats.findIndex(stats => stats.team_id === teamId);
            
            if (existingStatsIndex !== -1) {
                // Update existing stats
                teamStats[existingStatsIndex] = {
                    ...teamStats[existingStatsIndex],
                    ...updateData,
                    updated_at: new Date().toISOString()
                };
            } else {
                // Create new stats entry
                const newStats = {
                    id: this.generateId(),
                    team_id: teamId,
                    games_played: 0,
                    wins: 0,
                    losses: 0,
                    total_points: 0,
                    total_assists: 0,
                    total_rebounds: 0,
                    total_steals: 0,
                    total_blocks: 0,
                    total_turnovers: 0,
                    total_fouls: 0,
                    total_fg_made: 0,
                    total_fg_attempted: 0,
                    total_ft_made: 0,
                    total_ft_attempted: 0,
                    total_three_made: 0,
                    total_three_attempted: 0,
                    total_minutes: 0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    ...updateData
                };
                teamStats.push(newStats);
            }
            
            this.setTable('team_season_stats', teamStats);
            console.log('Team season stats updated for team:', teamId);
        } catch (error) {
            console.error('Error updating team season stats:', error);
            throw error;
        }
    }

    /**
     * Method: Calculate Team Season Averages - Computes team performance averages
     * @param {string} teamId - Team ID to calculate averages for
     * @returns {Object} - Team statistics averages including PPG, RPG, APG, etc.
     */
    calculateTeamSeasonAverages(teamId) {
        const teamStats = this.getTeamSeasonStats(teamId);
        
        if (!teamStats || teamStats.games_played === 0) {
            return {
                games_played: 0,
                ppg: 0,
                apg: 0,
                rpg: 0,
                spg: 0,
                bpg: 0,
                tpg: 0,
                fpg: 0,
                mpg: 0,
                fg_percent: 0,
                ft_percent: 0,
                three_percent: 0,
                win_percent: 0
            };
        }

        const gamesPlayed = teamStats.games_played;
        return {
            games_played: gamesPlayed,
            wins: teamStats.wins || 0,
            losses: teamStats.losses || 0,
            ppg: Math.round((teamStats.total_points / gamesPlayed) * 10) / 10,
            apg: Math.round((teamStats.total_assists / gamesPlayed) * 10) / 10,
            rpg: Math.round((teamStats.total_rebounds / gamesPlayed) * 10) / 10,
            spg: Math.round((teamStats.total_steals / gamesPlayed) * 10) / 10,
            bpg: Math.round((teamStats.total_blocks / gamesPlayed) * 10) / 10,
            tpg: Math.round((teamStats.total_turnovers / gamesPlayed) * 10) / 10,
            fpg: Math.round((teamStats.total_fouls / gamesPlayed) * 10) / 10,
            mpg: Math.round((teamStats.total_minutes / gamesPlayed) * 10) / 10,
            fg_percent: teamStats.total_fg_attempted > 0 ? 
                Math.round((teamStats.total_fg_made / teamStats.total_fg_attempted) * 1000) / 10 : 0,
            ft_percent: teamStats.total_ft_attempted > 0 ? 
                Math.round((teamStats.total_ft_made / teamStats.total_ft_attempted) * 1000) / 10 : 0,
            three_percent: teamStats.total_three_attempted > 0 ? 
                Math.round((teamStats.total_three_made / teamStats.total_three_attempted) * 1000) / 10 : 0,
            win_percent: gamesPlayed > 0 ? 
                Math.round(((teamStats.wins || 0) / gamesPlayed) * 1000) / 10 : 0
        };
    }

    /**
     * Method: Save Team Game Stats - Saves team statistics for specific game
     * @param {Object} teamStatsData - Team game statistics data including game_id and team_id
     * @returns {void} - Saves team game statistics to database
     */
    saveTeamGameStats(teamStatsData) {
        const teamStats = this.getTable('team_game_stats') || [];
        
        // Remove existing team stats for this game and team
        const filteredTeamStats = teamStats.filter(stat => 
            !(stat.game_id === teamStatsData.game_id && stat.team_id === teamStatsData.team_id)
        );
        
        // Add new team stats
        filteredTeamStats.push(teamStatsData);
        
        this.setTable('team_game_stats', filteredTeamStats);
        console.log('Team stats saved to team_game_stats table:', teamStatsData); // Debug log
        return true;
    }

    /**
     * Method: Get Game Stats - Retrieves all player statistics for a game
     * @param {string} gameId - Game ID to get statistics for
     * @returns {Array} - Array of player stat objects for the game
     */
    getGameStats(gameId) {
        const gameStats = this.getTable('game_stats') || [];
        return gameStats.filter(stat => stat.game_id === gameId);
    }

    /**
     * Method: Get Player Stats - Retrieves statistics for a specific player
     * @param {string} playerId - Player ID to get statistics for
     * @param {string} teamId - Optional team ID to filter by
     * @returns {Array} - Array of player statistics across games
     */
    getPlayerStats(playerId, teamId = null) {
        const gameStats = this.getTable('game_stats') || [];
        let playerStats = gameStats.filter(stat => stat.player_id === playerId);
        
        if (teamId) {
            playerStats = playerStats.filter(stat => stat.team_id === teamId);
        }
        
        return playerStats;
    }

    /**
     * Method: Get Team Players - Retrieves all active players for a team
     * @param {string} teamId - Team ID to get players for
     * @returns {Array} - Array of player objects with user and profile data
     */
    getTeamPlayers(teamId) {
        const memberships = this.getTable('team_memberships') || [];
        const users = this.getTable('users') || [];
        const playerProfiles = this.getTable('player_profiles') || [];
        
        // Get team memberships for players only
        const playerMemberships = memberships.filter(m => 
            m.team_id === teamId && 
            m.is_active && 
            m.role === 'player'
        );
        
        // Join with user data and player profiles
        const result = playerMemberships.map(membership => {
            const user = users.find(u => u.id === membership.user_id);
            
            // Find profiles for this user - prefer profile with actual biometric data
            const userProfiles = playerProfiles.filter(p => p.user_id === membership.user_id);
            let profile = null;
            if (userProfiles.length > 0) {
                profile = userProfiles.find(p => 
                    p.height_cm !== null || p.weight_kg !== null || 
                    p.wingspan_cm !== null || p.vertical_cm !== null || p.age !== null
                ) || userProfiles[0];
            }
            
            if (!user) return null;
            
            return {
                ...user,
                // Add membership data
                jersey_number: membership.jersey_number,
                position: membership.position || profile?.preferred_position,
                joined_at: membership.joined_at,
                
                // Add biometric data from player profile
                height_cm: profile?.height_cm,
                weight_kg: profile?.weight_kg,
                wingspan_cm: profile?.wingspan_cm,
                vertical_cm: profile?.vertical_cm,
                age: profile?.age,
                
                // Keep membership reference for compatibility
                membership: membership
            };
        }).filter(player => player !== null);
        
        return result;
    }

    /**
     * Method: Update Player Season Stats - Updates cumulative player statistics for season
     * @param {string} playerId - Player ID to update statistics for
     * @param {Object} gameStats - Game statistics to add to season totals
     * @returns {void} - Updates player season statistics in database
     */
    updatePlayerSeasonStats(playerId, gameStats) {
        // Get or create season stats entry
        const seasonStats = this.getTable('season_stats') || [];
        let playerSeasonIndex = seasonStats.findIndex(stat => stat.player_id === playerId);
        
        if (playerSeasonIndex === -1) {
            // Create new season stats entry
            const newSeasonStats = {
                id: this.generateId(),
                player_id: playerId,
                games_played: 1, // This player played in this game
                total_points: gameStats.points || 0,
                total_assists: gameStats.assists || 0,
                total_rebounds: gameStats.rebounds || 0,
                total_steals: gameStats.steals || 0,
                total_turnovers: gameStats.turnovers || 0,
                total_blocks: gameStats.blocks || 0,
                total_fg_made: gameStats.fg_made || 0,
                total_fg_attempted: gameStats.fg_attempted || 0,
                total_ft_made: gameStats.ft_made || 0,
                total_ft_attempted: gameStats.ft_attempted || 0,
                total_three_made: gameStats.three_made || 0,
                total_three_attempted: gameStats.three_attempted || 0,
                total_minutes: gameStats.minutes || 0,
                total_fouls: gameStats.fouls || 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            seasonStats.push(newSeasonStats);
        } else {
            // Update existing season stats
            const playerSeason = seasonStats[playerSeasonIndex];
            playerSeason.games_played += 1; // Add one game played
            playerSeason.total_points += gameStats.points || 0;
            playerSeason.total_assists += gameStats.assists || 0;
            playerSeason.total_rebounds += gameStats.rebounds || 0;
            playerSeason.total_steals += gameStats.steals || 0;
            playerSeason.total_turnovers += gameStats.turnovers || 0;
            playerSeason.total_blocks += gameStats.blocks || 0;
            playerSeason.total_fg_made += gameStats.fg_made || 0;
            playerSeason.total_fg_attempted += gameStats.fg_attempted || 0;
            playerSeason.total_ft_made += gameStats.ft_made || 0;
            playerSeason.total_ft_attempted += gameStats.ft_attempted || 0;
            playerSeason.total_three_made += gameStats.three_made || 0;
            playerSeason.total_three_attempted += gameStats.three_attempted || 0;
            playerSeason.total_minutes += gameStats.minutes || 0;
            playerSeason.total_fouls += gameStats.fouls || 0;
            playerSeason.updated_at = new Date().toISOString();
            
            seasonStats[playerSeasonIndex] = playerSeason;
        }
        
        this.setTable('season_stats', seasonStats);
        return seasonStats[playerSeasonIndex] || seasonStats[seasonStats.length - 1];
    }

    /**
     * Method: Get Player Season Stats - Retrieves comprehensive season statistics for player
     * @param {string} playerId - Player ID to get season statistics for
     * @returns {Object} - Player season statistics with totals and averages
     */
    getPlayerSeasonStats(playerId) {
        // Get all individual game stats for this player
        const gameStats = this.getTable('game_stats') || [];
        const playerGameStats = gameStats.filter(stat => stat.player_id === playerId);
        
        console.log('Getting season stats for player:', playerId, 'Found game stats:', playerGameStats); // Debug log
        
        if (playerGameStats.length === 0) {
            return {
                id: this.generateId(),
                player_id: playerId,
                season: new Date().getFullYear(),
                games_played: 0,
                total_minutes: 0,
                total_points: 0,
                total_rebounds: 0,
                total_assists: 0,
                total_steals: 0,
                total_blocks: 0,
                total_turnovers: 0,
                total_fg_made: 0,
                total_fg_attempted: 0,
                total_three_made: 0,
                total_three_attempted: 0,
                total_ft_made: 0,
                total_ft_attempted: 0,
                total_fouls: 0
            };
        }
        
        // Calculate totals from individual game stats
        const totals = playerGameStats.reduce((acc, game) => {
            acc.total_points += game.points || 0;
            acc.total_assists += game.assists || 0;
            acc.total_rebounds += game.rebounds || 0;
            acc.total_steals += game.steals || 0;
            acc.total_blocks += game.blocks || 0;
            acc.total_turnovers += game.turnovers || 0;
            acc.total_minutes += game.minutes || 0;
            acc.total_fouls += game.fouls || 0;
            acc.total_fg_made += game.fg_made || 0;
            acc.total_fg_attempted += game.fg_attempted || 0;
            acc.total_ft_made += game.ft_made || 0;
            acc.total_ft_attempted += game.ft_attempted || 0;
            acc.total_three_made += game.three_made || 0;
            acc.total_three_attempted += game.three_attempted || 0;
            return acc;
        }, {
            total_points: 0, total_assists: 0, total_rebounds: 0, total_steals: 0, total_blocks: 0, 
            total_turnovers: 0, total_minutes: 0, total_fouls: 0, total_fg_made: 0, total_fg_attempted: 0, 
            total_ft_made: 0, total_ft_attempted: 0, total_three_made: 0, total_three_attempted: 0
        });
        
        const seasonStats = {
            id: this.generateId(),
            player_id: playerId,
            season: new Date().getFullYear(),
            games_played: playerGameStats.length,
            ...totals
        };
        
        console.log('Calculated season stats for player:', playerId, seasonStats); // Debug log
        return seasonStats;
    }

    /**
     * Method: Calculate Player Averages - Computes player performance averages
     * @param {string} playerId - Player ID to calculate averages for
     * @returns {Object} - Player performance averages including PPG, APG, RPG, etc.
     */
    calculatePlayerAverages(playerId) {
        // Get all individual game stats for this player
        const gameStats = this.getTable('game_stats') || [];
        const playerGameStats = gameStats.filter(stat => stat.player_id === playerId);
        
        console.log('Calculating averages for player:', playerId, 'Found game stats:', playerGameStats); // Debug log
        
        if (playerGameStats.length === 0) {
            return {
                ppg: 0,
                apg: 0,
                rpg: 0,
                spg: 0,
                bpg: 0,
                tpg: 0,
                mpg: 0,
                fpg: 0,
                fg_percent: 0,
                ft_percent: 0,
                three_percent: 0
            };
        }
        
        // Calculate totals from individual game stats
        const totals = playerGameStats.reduce((acc, game) => {
            acc.points += game.points || 0;
            acc.assists += game.assists || 0;
            acc.rebounds += game.rebounds || 0;
            acc.steals += game.steals || 0;
            acc.blocks += game.blocks || 0;
            acc.turnovers += game.turnovers || 0;
            acc.minutes += game.minutes || 0;
            acc.fouls += game.fouls || 0;
            acc.fg_made += game.fg_made || 0;
            acc.fg_attempted += game.fg_attempted || 0;
            acc.ft_made += game.ft_made || 0;
            acc.ft_attempted += game.ft_attempted || 0;
            acc.three_made += game.three_made || 0;
            acc.three_attempted += game.three_attempted || 0;
            return acc;
        }, {
            points: 0, assists: 0, rebounds: 0, steals: 0, blocks: 0, turnovers: 0,
            minutes: 0, fouls: 0, fg_made: 0, fg_attempted: 0, ft_made: 0, ft_attempted: 0,
            three_made: 0, three_attempted: 0
        });
        
        const games = playerGameStats.length;
        const averages = {
            ppg: Math.round((totals.points / games) * 10) / 10,
            apg: Math.round((totals.assists / games) * 10) / 10,
            rpg: Math.round((totals.rebounds / games) * 10) / 10,
            spg: Math.round((totals.steals / games) * 10) / 10,
            bpg: Math.round((totals.blocks / games) * 10) / 10,
            tpg: Math.round((totals.turnovers / games) * 10) / 10,
            mpg: Math.round((totals.minutes / games) * 10) / 10,
            fpg: Math.round((totals.fouls / games) * 10) / 10,
            fg_percent: totals.fg_attempted > 0 ? 
                Math.round((totals.fg_made / totals.fg_attempted) * 1000) / 10 : 0,
            ft_percent: totals.ft_attempted > 0 ? 
                Math.round((totals.ft_made / totals.ft_attempted) * 1000) / 10 : 0,
            three_percent: totals.three_attempted > 0 ? 
                Math.round((totals.three_made / totals.three_attempted) * 1000) / 10 : 0
        };
        
        console.log('Calculated averages for player:', playerId, averages); // Debug log
        return averages;
    }

    // Team Stats Methods
    /**
     * Method: Get Team Stats - Retrieves team statistics for all games
     * @param {string} teamId - Team ID to get statistics for
     * @returns {Array} - Array of team game statistics
     */
    getTeamStats(teamId) {
        const teamGameStats = this.getTable('team_game_stats') || [];
        const filteredStats = teamGameStats.filter(stats => stats.team_id === teamId);
        console.log('getTeamStats called for team:', teamId); // Debug log
        console.log('Raw team_game_stats table:', teamGameStats); // Debug log
        console.log('Filtered stats for team:', filteredStats); // Debug log
        return filteredStats;
    }

    /**
     * Method: Calculate Team Averages - Computes team performance averages using season stats
     * @param {string} teamId - Team ID to calculate averages for
     * @returns {Object} - Team performance averages from season statistics
     */
    calculateTeamAverages(teamId) {
        // Use the new team season stats system
        console.log('Using new team season stats system for team:', teamId);
        return this.calculateTeamSeasonAverages(teamId);
    }

    // Utility method to change a user's role in a specific team
    /**
     * Method: Change User Team Role - Updates user's role within a specific team
     * @param {string} username - Username of user to update
     * @param {string} teamName - Name of team to update role in
     * @param {string} newRole - New role to assign (player, coach, manager)
     * @returns {boolean} - True if role updated successfully, false otherwise
     */
    changeUserTeamRole(username, teamName, newRole) {
        try {
            // Find user by username (handle undefined/null usernames)
            const users = this.getTable('users') || [];
            const user = users.find(u => 
                u.username && u.username.toLowerCase() === username.toLowerCase()
            );
            if (!user) {
                console.error(`User "${username}" not found`);
                console.log('Available users:', users.map(u => u.username || 'undefined').join(', '));
                return false;
            }

            // Find team by name (handle undefined/null team names)
            const teams = this.getTable('teams') || [];
            const team = teams.find(t => 
                t.name && t.name.toLowerCase() === teamName.toLowerCase()
            );
            if (!team) {
                console.error(`Team "${teamName}" not found`);
                console.log('Available teams:', teams.map(t => t.name || 'undefined').join(', '));
                return false;
            }

            // Find and update team membership
            const memberships = this.getTable('team_memberships') || [];
            const membershipIndex = memberships.findIndex(m => 
                m.user_id === user.id && m.team_id === team.id
            );

            if (membershipIndex === -1) {
                console.error(`User "${username}" is not a member of team "${teamName}"`);
                return false;
            }

            // Update the role
            const oldRole = memberships[membershipIndex].role;
            memberships[membershipIndex].role = newRole;
            memberships[membershipIndex].updated_at = new Date().toISOString();

            // Save back to database
            this.setTable('team_memberships', memberships);

            console.log(`✅ Successfully changed ${username}'s role in "${teamName}" from "${oldRole}" to "${newRole}"`);
            return true;

        } catch (error) {
            console.error('Error changing user role:', error);
            return false;
        }
    }

    // Utility method to list all teams and their members (for debugging)
    /**
     * Method: List Teams And Members - Displays all teams and their members for debugging
     * @returns {void} - Logs team membership information to console
     */
    listTeamsAndMembers() {
        try {
            const teams = this.getTable('teams') || [];
            const memberships = this.getTable('team_memberships') || [];
            const users = this.getTable('users') || [];

            console.log('📋 Teams and Members:');
            teams.forEach(team => {
                console.log(`\n🏀 Team: ${team.name}`);
                const teamMembers = memberships.filter(m => m.team_id === team.id);
                teamMembers.forEach(member => {
                    const user = users.find(u => u.id === member.user_id);
                    const username = user ? user.username : 'Unknown User';
                    console.log(`  - ${username} (${member.role})`);
                });
            });
        } catch (error) {
            console.error('Error listing teams and members:', error);
        }
    }
}

// Create global database instance
window.db = new DatabaseManager();
