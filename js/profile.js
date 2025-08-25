/**
 * File Name: profile.js
 * Purpose: Handles user profile management, including viewing and editing personal information, 
 *          managing team memberships, and tracking player performance.
 * Author: Brooklyn Ridley
 * Date Created: 7th August 2025
 * Last Modified: 25th August 2025
    */
class ProfileApp {
    constructor() {
        this.db = null;
        this.currentUser = null;
        this.playerProfile = null;
        this.seasonStats = null;
        this.averageStats = null;
        this.notes = [];
        
        this.init();
    }

    /**
     * PURPOSE: Initializes the profile application with authentication, data loading, and interface setup
     * 
     * INPUTS: None (uses global window.db and URL authentication)
     * 
     * OUTPUTS:
     * - Complete user profile interface rendered
     * - Player statistics and team information loaded
     * - Recent message functionality enabled
     * - Reply button event listeners attached
     * 
     * JUSTIFICATION: This initialization method ensures proper application startup
     * with comprehensive error handling and dependency management. The method
     * handles authentication validation and provides graceful fallbacks for
     * missing data while enabling full profile functionality.
     * 
     * FUTURE ENHANCEMENTS:
     * - Add profile photo upload functionality
     * - Implement real-time profile updates
     * - Add profile sharing and export capabilities
     */
    async init() {
        try {
            console.log('ProfileApp initializing...');
            
            // Wait for database to be ready
            await this.waitForDatabase();
            console.log('Database ready');
            
            // Check if user is logged in
            this.currentUser = this.db.getCurrentUser();
            console.log('Current user:', this.currentUser);
            
            if (!this.currentUser) {
                console.log('No user found, redirecting to login');
                this.redirectToLogin();
                return;
            }

            // Load player data from database
            await this.loadPlayerData();
            console.log('Player data loaded');
            
            this.render();
            console.log('Profile rendered');
            
            // Setup reply button event listeners
            this.setupReplyButtonListeners();
        } catch (error) {
            console.error('Error initializing profile:', error);
            this.showError('Failed to load profile data');
        }
    }

    // Wait for database initialization with retry mechanism
    async waitForDatabase() {
        return new Promise((resolve) => {
            const checkDatabase = () => {
                if (window.db) {
                    this.db = window.db;
                    resolve();
                } else {
                    setTimeout(checkDatabase, 100);
                }
            };
            checkDatabase();
        });
    }

    /**
     * PURPOSE: Loads comprehensive player data including profile, statistics, and communication history
     * 
     * INPUTS: None (uses this.currentUser.id from authenticated session)
     * 
     * OUTPUTS:
     * - this.playerProfile: Complete player profile information
     * - this.seasonStats: Current season statistical data
     * - this.averageStats: Calculated performance averages
     * - this.notes: Recent message and communication history
     * 
     * JUSTIFICATION: Centralizing data loading ensures consistency across the
     * profile interface and provides a single point for data refresh operations.
     * The method handles missing data gracefully while providing comprehensive
     * player information for coaches and personal tracking.
     * 
     * FUTURE ENHANCEMENTS:
     * - Add multi-season statistical comparisons
     * - Implement performance trend analysis
     * - Add achievement and milestone tracking
     */
    async loadPlayerData() {
        // Get or create player profile
        this.playerProfile = this.db.getPlayerProfile(this.currentUser.id) || {};
        
        // Get season stats and averages
        this.seasonStats = this.db.getPlayerSeasonStats(this.currentUser.id);
        this.averageStats = this.db.calculatePlayerAverages(this.currentUser.id);
        
        // Get notes for this player
        this.notes = this.db.getNotesForPlayer(this.currentUser.id) || [];
        
        console.log('Profile data loaded:', {
            profile: this.playerProfile,
            seasonStats: this.seasonStats,
            averageStats: this.averageStats,
            notes: this.notes
        });
    }

    // Determine if statistics should be displayed based on user role
    shouldShowStats() {
        // Only show stats for players and coaches
        return ['player', 'coach'].includes(this.currentUser.role);
    }

    /**
     * PURPOSE: Renders complete profile interface with role-appropriate content and responsive layout
     * 
     * INPUTS: None (uses loaded profile data and user information)
     * 
     * OUTPUTS:
     * - Complete HTML profile interface injected into profile-content container
     * - Role-specific content display (statistics for players/coaches)
     * - Team management interface with join/leave functionality
     * - Recent messages preview with reply capabilities
     * 
     * JUSTIFICATION: This comprehensive rendering method provides a personalized
     * profile experience tailored to user roles and team memberships. The
     * responsive layout ensures optimal viewing across devices while maintaining
     * professional appearance for team management purposes.
     * 
     * FUTURE ENHANCEMENTS:
     * - Add customizable profile layouts
     * - Implement drag-and-drop section reordering
     * - Add profile privacy controls and visibility settings
     */
    render() {
        const container = document.getElementById('profile-content');
        
        // Get user's initials for avatar
        const firstName = this.currentUser.first_name || this.currentUser.firstName || 'U';
        const lastName = this.currentUser.last_name || this.currentUser.lastName || 'U';
        const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
        
        container.innerHTML = `
            <div class="profile-container">
                <!-- Profile Header Card with Edit Button -->
                <div class="profile-header-card">
                    <div class="profile-avatar">${initials}</div>
                    <div class="profile-info">
                        <h1>${firstName} ${lastName}</h1>
                        <p class="profile-subtitle">Profile Page</p>
                    </div>
                    <button class="edit-details-btn" onclick="profileApp.editDetails()">
                        <i class="bi bi-pencil-fill"></i> Edit Details
                    </button>
                </div>

                <!-- Second Row: Season Stats and Team Details (50/50) -->
                <div class="profile-row-two">
                    ${this.shouldShowStats() ? this.renderStatsCard() : ''}
                    ${this.renderTeamDetailsCard()}
                </div>

                <!-- Third Row: Full Width Notes Card -->
                <div class="profile-row-three">
                    ${this.renderNotesCard()}
                </div>
            </div>
        `;
    }

    // Render season statistics card with performance metrics
    renderStatsCard() {
        const stats = this.averageStats;
        const season = this.seasonStats;
        
        return `
            <div class="profile-card stats-card">
                <div class="card-header">
                    <h2 class="card-title">Season Statistics</h2>
                </div>
                <div class="card-content">
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-value">${season.games_played || 0}</span>
                            <span class="stat-label">Games</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${stats.ppg || 0}</span>
                            <span class="stat-label">PPG</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${stats.rpg || 0}</span>
                            <span class="stat-label">RPG</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${stats.apg || 0}</span>
                            <span class="stat-label">APG</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${stats.spg || 0}</span>
                            <span class="stat-label">SPG</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${stats.bpg || 0}</span>
                            <span class="stat-label">BPG</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${stats.mpg || 0}</span>
                            <span class="stat-label">MPG</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${stats.fg_percent || 0}%</span>
                            <span class="stat-label">FG%</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Render team details card with join/leave functionality
    renderTeamDetailsCard() {
        // Get user's current teams
        const userTeams = this.getUserTeams();
        const fullWidthClass = this.shouldShowStats() ? '' : 'full-width';
        
        return `
            <div class="profile-card team-details-card ${fullWidthClass}">
                <div class="card-header">
                    <h2 class="card-title">Team Details</h2>
                    <button class="edit-btn" onclick="profileApp.joinTeam()">
                        ➕ Join Team
                    </button>
                </div>
                <div class="card-content">
                    ${userTeams.length > 0 ? `
                        <div class="current-teams">
                            ${userTeams.map(team => `
                                <div class="team-item">
                                    <div class="team-logo" style="background: ${team.color || '#3182ce'};">
                                        ${team.logo || '<i class="bi bi-trophy-fill"></i>'}
                                    </div>
                                    <div class="team-details">
                                        <div class="team-name">${team.name}</div>
                                        <div class="team-league">${team.league || 'Basketball League'} • ${team.season || '2024-25'}</div>
                                        <div class="team-role">Role: ${team.role}</div>
                                    </div>
                                    <button class="leave-team-btn" onclick="profileApp.leaveTeam('${team.id}', '${team.name}', '${team.membershipId}')">
                                        Leave
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="no-teams">
                            <p>You are not currently part of any teams.</p>
                            <p>Use the "Join Team" button to join a team using a registration key.</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    renderDetailsCard() {
        const profile = this.playerProfile;
        
        return `
            <div class="profile-card">
                <div class="card-header">
                    <h2 class="card-title">Details</h2>
                    <button class="edit-btn" onclick="profileApp.editDetails()">
                        <i class="bi bi-pencil-fill"></i> Edit Details
                    </button>
                </div>
                <div class="card-content">
                    <div class="details-grid">
                        <div class="detail-item">
                            <span class="detail-label">Height</span>
                            <span class="detail-value">${profile.height_cm ? profile.height_cm + 'cm' : 'Not set'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Weight</span>
                            <span class="detail-value">${profile.weight_kg ? profile.weight_kg + 'kg' : 'Not set'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Age</span>
                            <span class="detail-value">${profile.age || 'Not set'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Wingspan</span>
                            <span class="detail-value">${profile.wingspan_cm ? profile.wingspan_cm + 'cm' : 'Not set'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Vertical</span>
                            <span class="detail-value">${profile.vertical_cm ? profile.vertical_cm + 'cm' : 'Not set'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Position</span>
                            <span class="detail-value">${profile.preferred_position || 'Not set'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Hometown</span>
                            <span class="detail-value">${profile.hometown || 'Not set'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Experience</span>
                            <span class="detail-value">${profile.experience_years ? profile.experience_years + ' years' : 'Not set'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderTeamManagementCard() {
        // Get user's current teams
        const userTeams = this.getUserTeams();
        
        // Debug: Also check all teams and memberships
        console.log('All teams in database:', this.db.getTable('teams'));
        console.log('All memberships in database:', this.db.getTable('team_memberships'));
        console.log('Current user ID:', this.currentUser.id);
        
        return `
            <div class="profile-card">
                <div class="card-header">
                    <h2 class="card-title">Team Management</h2>
                    <button class="edit-btn" onclick="profileApp.joinTeam()">
                        ➕ Join Team
                    </button>
                </div>
                <div class="card-content">
                    ${userTeams.length > 0 ? `
                        <div class="current-teams">
                            <h4 style="color: var(--text-primary); margin: 0 0 1rem 0;">Current Teams:</h4>
                            ${userTeams.map(team => `
                                <div class="team-item" style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: var(--bg-primary); border: 1px solid var(--border-secondary); border-radius: 8px; margin-bottom: 0.5rem;">
                                    <div class="team-logo" style="width: 40px; height: 40px; background: ${team.color || '#6366f1'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                                        ${team.logo || '<i class="bi bi-trophy-fill"></i>'}
                                    </div>
                                    <div class="team-details" style="flex: 1;">
                                        <div style="color: var(--text-primary); font-weight: 600;">${team.name}</div>
                                        <div style="color: var(--text-secondary); font-size: 0.9rem;">${team.league || 'Basketball League'} • ${team.season || '2024-25'}</div>
                                        <div style="color: var(--text-secondary); font-size: 0.8rem;">Role: ${team.role}</div>
                                    </div>
                                    <button class="leave-team-btn" onclick="profileApp.leaveTeam('${team.id}', '${team.name}', '${team.membershipId}')" 
                                            style="background: #ef4444; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">
                                        Leave
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="no-teams" style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                            <p>You are not currently part of any teams.</p>
                            <p>Use the "Join Team" button to join a team using a registration key.</p>
                            <div style="margin-top: 1rem; font-size: 0.8rem; opacity: 0.7;">
                                Debug: Found ${userTeams.length} teams for user ${this.currentUser.id}
                            </div>
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    // Render recent messages card with reply functionality
    renderNotesCard() {
        const recentMessages = this.getRecentMessages();
        
        return `
            <div class="profile-card notes-card">
                <div class="card-header">
                    <h2 class="card-title">Recent Messages</h2>
                    <button class="view-all-btn" onclick="window.location.href='notes.html'">
                        View All
                    </button>
                </div>
                <div class="card-content">
                    ${recentMessages.length > 0 ? `
                        <div class="messages-preview">
                            ${recentMessages.map(message => `
                                <div class="message-preview">
                                    <div class="message-header">
                                        <span class="sender-name">${message.sender_name}</span>
                                        <div class="message-actions">
                                            <span class="message-time">${this.formatTime(message.timestamp)}</span>
                                            <button class="reply-btn" data-user-id="${message.fromUserId}" data-user-name="${message.sender_name}">
                                                Reply
                                            </button>
                                        </div>
                                    </div>
                                    <div class="message-content">${this.truncateMessage(message.message, 80)}</div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="no-messages">
                            <p>No recent messages to display.</p>
                            <p>Connect with your team through the Messages page.</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    // Retrieve and format recent messages for display
    getRecentMessages() {
        try {
            const currentUser = this.db.getCurrentUser();
            if (!currentUser) return [];

            const userTeams = this.getUserTeams();
            const teamIds = userTeams.map(team => team.id);
            
            if (teamIds.length === 0) return [];

            const notes = this.db.getTable('notes') || [];
            console.log('All notes in database:', notes);
            console.log('Current user ID:', currentUser.id);
            
            // Check both old and new field structures to be compatible
            const userMessages = notes.filter(note => {
                // Check new structure first (author_id/recipient_id)
                const newStructureMatch = note.recipient_id === currentUser.id && note.author_id !== currentUser.id;
                // Check old structure as fallback (fromUserId/toUserId)
                const oldStructureMatch = note.toUserId === currentUser.id && note.fromUserId !== currentUser.id;
                
                console.log(`Note ${note.id}:`, {
                    author_id: note.author_id,
                    recipient_id: note.recipient_id,
                    fromUserId: note.fromUserId,
                    toUserId: note.toUserId,
                    newStructureMatch,
                    oldStructureMatch
                });
                
                return newStructureMatch || oldStructureMatch;
            });

            console.log('Filtered user messages:', userMessages);

            // Sort by timestamp (newest first) and take the 3 most recent
            const recentMessages = userMessages
                .sort((a, b) => new Date(b.created_at || b.timestamp) - new Date(a.created_at || a.timestamp))
                .slice(0, 3)
                .map(note => ({
                    ...note,
                    sender_name: this.getSenderName(note.author_id || note.fromUserId),
                    message: note.content,
                    fromUserId: note.author_id || note.fromUserId, // For compatibility with reply functionality
                    timestamp: note.created_at || note.timestamp
                }));
                
            console.log('Final recent messages:', recentMessages);
            return recentMessages;
        } catch (error) {
            console.error('Error fetching recent messages:', error);
            return [];
        }
    }

    // Get sender display name from user database
    getSenderName(senderId) {
        try {
            const users = this.db.getTable('users') || [];
            const user = users.find(u => u.id === senderId);
            if (!user) return 'Unknown';
            
            // Return full name (first name + last name) instead of username/email
            const firstName = user.first_name || '';
            const lastName = user.last_name || '';
            const fullName = `${firstName} ${lastName}`.trim();
            
            // Fallback to username if no name is available
            return fullName || user.username || 'Unknown';
        } catch (error) {
            console.error('Error fetching sender name:', error);
            return 'Unknown';
        }
    }

    // Format timestamp for human-readable display
    formatTime(timestamp) {
        try {
            const date = new Date(timestamp);
            const now = new Date();
            const diff = now - date;
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            
            if (days === 0) {
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } else if (days === 1) {
                return 'Yesterday';
            } else if (days < 7) {
                return `${days} days ago`;
            } else {
                return date.toLocaleDateString();
            }
        } catch (error) {
            return 'Recently';
        }
    }

    // Truncate long messages for preview display
    truncateMessage(message, maxLength) {
        if (message.length <= maxLength) return message;
        return message.substring(0, maxLength) + '...';
    }

    replyToMessage(userId, userName) {
        // Navigate to notes page with the specific user selected
        // We'll pass the user info in URL parameters
        const notesUrl = `notes.html?selectUser=${encodeURIComponent(userId)}&userName=${encodeURIComponent(userName)}`;
        window.location.href = notesUrl;
    }

    setupReplyButtonListeners() {
        // Add event listeners to all reply buttons
        const replyButtons = document.querySelectorAll('.reply-btn');
        replyButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const userId = button.getAttribute('data-user-id');
                const userName = button.getAttribute('data-user-name');
                
                if (userId && userName) {
                    this.replyToMessage(userId, userName);
                } else {
                    console.error('Missing user data on reply button');
                }
            });
        });
    }

    renderRecentNote(note) {
        const author = this.db.getUser(note.author_id);
        const authorName = author ? `${author.first_name || author.firstName || ''} ${author.last_name || author.lastName || ''}`.trim() : 'Unknown';
        
        // Get author initials
        const firstName = author?.first_name || author?.firstName || 'U';
        const lastName = author?.last_name || author?.lastName || 'U';
        const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
        
        const noteDate = new Date(note.created_at);
        const timeStr = noteDate.toLocaleDateString() + ' ' + noteDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Truncate long messages
        const maxLength = 100;
        const truncatedContent = note.content.length > maxLength ? 
            note.content.substring(0, maxLength) + '...' : 
            note.content;

        return `
            <div class="recent-note-item">
                <div class="note-avatar">${initials}</div>
                <div class="note-content">
                    <div class="note-header">
                        <span class="note-author">${authorName}</span>
                        <span class="note-time">${timeStr}</span>
                    </div>
                    <div class="note-text">${truncatedContent}</div>
                </div>
            </div>
        `;
    }

    editDetails() {
        this.showEditModal();
    }

    goToNotes() {
        // Navigate to a dedicated notes page - you can implement this as needed
        // For now, let's navigate to manager page with notes view or create a dedicated notes page
        window.location.href = 'notes.html';
    }

    /**
     * PURPOSE: Creates and displays comprehensive profile editing modal with form validation
     * 
     * INPUTS: None (uses current profile data for pre-population)
     * 
     * OUTPUTS:
     * - Modal dialog with complete profile editing form
     * - Pre-populated fields with current profile information
     * - Form validation and submission handling
     * - Cancel and save functionality with proper error handling
     * 
     * JUSTIFICATION: The profile editing modal provides comprehensive control
     * over personal information while maintaining data integrity through
     * validation. The modal design ensures focused editing without navigation
     * disruption and supports both basic and extended profile fields.
     * 
     * FUTURE ENHANCEMENTS:
     * - Add field-specific validation rules
     * - Implement profile image upload and cropping
     * - Add form auto-save for data protection
     */
    showEditModal() {
        const profile = this.playerProfile;
        
        const modalContent = `
            <div class="modal-header">
                <h3>Edit Details</h3>
                <button onclick="profileApp.closeModal()" class="close-btn">×</button>
            </div>
            <form id="editDetailsForm" class="edit-form">
                <div class="form-group">
                    <label>Height (cm)</label>
                    <input type="number" name="height_cm" value="${profile.height_cm || ''}" placeholder="183">
                </div>
                <div class="form-group">
                    <label>Weight (kg)</label>
                    <input type="number" name="weight_kg" value="${profile.weight_kg || ''}" placeholder="73">
                </div>
                <div class="form-group">
                    <label>Age</label>
                    <input type="number" name="age" value="${profile.age || ''}" placeholder="17">
                </div>
                <div class="form-group">
                    <label>Wingspan (cm)</label>
                    <input type="number" name="wingspan_cm" value="${profile.wingspan_cm || ''}" placeholder="185">
                </div>
                <div class="form-group">
                    <label>Vertical (cm)</label>
                    <input type="number" name="vertical_cm" value="${profile.vertical_cm || ''}" placeholder="83">
                </div>
                <div class="form-group">
                    <label>Preferred Position</label>
                    <select name="preferred_position">
                        <option value="">Select position</option>
                        <option value="Point Guard" ${profile.preferred_position === 'Point Guard' ? 'selected' : ''}>Point Guard</option>
                        <option value="Shooting Guard" ${profile.preferred_position === 'Shooting Guard' ? 'selected' : ''}>Shooting Guard</option>
                        <option value="Small Forward" ${profile.preferred_position === 'Small Forward' ? 'selected' : ''}>Small Forward</option>
                        <option value="Power Forward" ${profile.preferred_position === 'Power Forward' ? 'selected' : ''}>Power Forward</option>
                        <option value="Center" ${profile.preferred_position === 'Center' ? 'selected' : ''}>Center</option>
                        <option value="Sixth Man" ${profile.preferred_position === 'Sixth Man' ? 'selected' : ''}>Sixth Man</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Hometown</label>
                    <input type="text" name="hometown" value="${profile.hometown || ''}" placeholder="Melbourne, VIC">
                </div>
                <div class="form-group">
                    <label>Experience (years)</label>
                    <input type="number" name="experience_years" value="${profile.experience_years || ''}" placeholder="3">
                </div>
                <div class="form-group">
                    <label>Emergency Contact Name</label>
                    <input type="text" name="emergency_contact_name" value="${profile.emergency_contact_name || ''}" placeholder="Sarah Ridley">
                </div>
                <div class="form-group">
                    <label>Emergency Contact Phone</label>
                    <input type="tel" name="emergency_contact_phone" value="${profile.emergency_contact_phone || ''}" placeholder="0412 345 678">
                </div>
                <div class="form-group">
                    <label>Medical Notes</label>
                    <textarea name="medical_notes" placeholder="Any medical conditions or notes...">${profile.medical_notes || ''}</textarea>
                </div>
                <div class="form-actions">
                    <button type="button" onclick="profileApp.closeModal()" class="btn-secondary">Cancel</button>
                    <button type="submit" class="btn-primary">Save Changes</button>
                </div>
            </form>
        `;

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                ${modalContent}
            </div>
        `;

        document.body.appendChild(modal);

        // Add form submit handler
        const form = modal.querySelector('form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProfileChanges(form);
        });
    }

    /**
     * PURPOSE: Saves profile changes to database with validation and error handling
     * 
     * INPUTS: form (HTMLFormElement containing updated profile data)
     * 
     * OUTPUTS:
     * - Profile data validated and saved to database
     * - Interface updated with new information
     * - Success/error feedback provided to user
     * - Modal closed upon successful save
     * 
     * JUSTIFICATION: This method ensures data integrity through proper validation
     * and type conversion while providing immediate feedback to users. The
     * error handling prevents data corruption and guides users through
     * correction of invalid inputs.
     * 
     * FUTURE ENHANCEMENTS:
     * - Add server-side validation for enhanced security
     * - Implement change tracking and audit logging
     * - Add bulk profile updates for team management
     */
    async saveProfileChanges(form) {
        try {
            const formData = new FormData(form);
            const updates = {};

            for (const [key, value] of formData.entries()) {
                if (value.trim()) {
                    // Convert numeric fields
                    if (['height_cm', 'weight_kg', 'wingspan_cm', 'vertical_cm', 'experience_years', 'age'].includes(key)) {
                        updates[key] = parseInt(value);
                    } else {
                        updates[key] = value;
                    }
                }
            }

            // Update or create profile in database
            if (Object.keys(this.playerProfile).length > 0) {
                this.db.updatePlayerProfile(this.currentUser.id, updates);
            } else {
                updates.user_id = this.currentUser.id;
                this.db.createPlayerProfile(this.currentUser.id, updates);
            }

            // Reload data and re-render
            await this.loadPlayerData();
            this.render();
            this.closeModal();
            this.showSuccess('Profile updated successfully!');

        } catch (error) {
            console.error('Error saving profile changes:', error);
            this.showError('Failed to save changes');
        }
    }

    // Close modal dialog
    closeModal() {
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            modal.remove();
        }
    }

    // Display success message to user
    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    // Display error message to user
    showError(message) {
        this.showMessage(message, 'error');
    }

    // Create and display temporary message notification
    showMessage(message, type = 'info') {
        // Create message element if it doesn't exist
        let messageEl = document.querySelector('.message-display');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.className = 'message-display';
            messageEl.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 0.75rem 1rem;
                border-radius: 6px;
                color: white;
                font-weight: 500;
                z-index: 1001;
                display: none;
                animation: slideIn 0.3s ease-out;
            `;
            document.body.appendChild(messageEl);
        }
        
        messageEl.textContent = message;
        messageEl.className = `message-display ${type}`;
        
        // Set colors based on type
        if (type === 'success') {
            messageEl.style.background = '#22c55e';
        } else if (type === 'error') {
            messageEl.style.background = '#ef4444';
        } else {
            messageEl.style.background = '#3182ce';
        }
        
        messageEl.style.display = 'block';
        
        // Auto-hide after 4 seconds
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 4000);
    }

    // Redirect user to login page
    redirectToLogin() {
        window.location.href = 'index.html';
    }

    // Retrieve all teams that the current user is a member of
    getUserTeams() {
        const currentUser = this.db.getCurrentUser();
        if (!currentUser) {
            console.log('No current user found');
            return [];
        }

        console.log('Getting teams for user:', currentUser.id);
        
        // Get all teams and check which ones the user is a member of
        const teams = this.db.getTable('teams');
        console.log('Available teams:', teams);
        
        // Let's also check the raw memberships table to see the actual structure
        const rawMemberships = this.db.getTable('team_memberships');
        console.log('Raw team_memberships table:', rawMemberships);
        
        // Let's see if there are any memberships at all
        if (rawMemberships && rawMemberships.length > 0) {
            console.log('Sample membership structure:', rawMemberships[0]);
            console.log('All membership user IDs:', rawMemberships.map(m => m.user_id || m.userId));
            console.log('Current user ID to match:', currentUser.id);
        }
        
        const userTeams = [];
        
        teams.forEach(team => {
            console.log(`\n--- Checking team: ${team.name} (ID: ${team.id}) ---`);
            
            // Use the same approach as manager.js - get team members and check if current user is in it
            const teamMembers = this.db.getTeamMembers(team.id);
            console.log(`Team ${team.name} members from getTeamMembers():`, teamMembers);
            
            // Let's also manually check the memberships for this team
            const manualMemberships = rawMemberships.filter(m => 
                (m.team_id === team.id || m.teamId === team.id) && 
                (m.is_active === undefined || m.is_active === true)
            );
            console.log(`Manual memberships for team ${team.name}:`, manualMemberships);
            
            const userMembership = teamMembers.find(member => member.id === currentUser.id);
            if (userMembership) {
                console.log(`✅ User IS member of team ${team.name}:`, userMembership);
                userTeams.push({
                    ...team,
                    role: userMembership.membership?.role || 'player',
                    membershipId: userMembership.membership?.id
                });
            } else {
                console.log(`❌ User is NOT member of team ${team.name}`);
                // Let's check if there's a membership but the getTeamMembers isn't finding it
                const directMembership = manualMemberships.find(m => 
                    (m.user_id === currentUser.id || m.userId === currentUser.id)
                );
                if (directMembership) {
                    console.log(`🔍 But found direct membership:`, directMembership);
                }
            }
        });
        
        console.log('Final user teams:', userTeams);
        return userTeams;
    }

    joinTeam() {
        // Create modal for team joining
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Join a Team</h3>
                    <span class="modal-close">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="joinTeamForm">
                        <div class="form-group">
                            <label for="registrationKey">Team Registration Key:</label>
                            <input type="text" id="registrationKey" name="registrationKey" required 
                                   placeholder="Enter the team's registration key" maxlength="50">
                            <small class="help-text">Ask your coach or team manager for the registration key</small>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn--secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                            <button type="submit" class="btn btn--primary">Join Team</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'flex';

        // Handle form submission
        const form = modal.querySelector('#joinTeamForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const registrationKey = formData.get('registrationKey').trim();

            if (!registrationKey) {
                this.showMessage('Please enter a registration key', 'error');
                return;
            }

            this.processTeamJoin(registrationKey, modal);
        });

        // Handle close button
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    /**
     * PURPOSE: Processes team registration using invitation keys with validation and membership creation
     * 
     * INPUTS: registrationKey (string), modal (DOM element for UI feedback)
     * 
     * OUTPUTS:
     * - Team membership validated and created in database
     * - User added to team with appropriate role assignment
     * - Success feedback and interface refresh
     * - Error handling for invalid keys or existing memberships
     * 
     * JUSTIFICATION: The team joining process requires secure validation to
     * prevent unauthorized access while providing smooth onboarding for
     * legitimate team members. The method handles duplicate detection and
     * provides clear feedback throughout the process.
     * 
     * FUTURE ENHANCEMENTS:
     * - Add role-specific invitation codes
     * - Implement approval workflows for sensitive teams
     * - Add team capacity limits and waiting lists
     */
    processTeamJoin(registrationKey, modal) {
        const currentUser = this.db.getCurrentUser();
        if (!currentUser) {
            this.showMessage('Authentication error. Please log in again.', 'error');
            return;
        }

        // Find team with matching registration key
        const teams = this.db.getTable('teams');
        const team = teams.find(t => t.registrationKey === registrationKey);

        if (!team) {
            this.showMessage('Invalid registration key. Please check and try again.', 'error');
            return;
        }

        // Check if user is already a member
        const memberships = this.db.getTable('team_memberships');
        const existingMembership = memberships.find(m => 
            m.userId === currentUser.id && m.teamId === team.id
        );

        if (existingMembership) {
            this.showMessage('You are already a member of this team.', 'error');
            return;
        }

        // Create new membership
        const newMembership = {
            id: this.generateId(),
            userId: currentUser.id,
            teamId: team.id,
            role: 'player',
            joinedAt: new Date().toISOString(),
            isActive: true
        };

        try {
            // Add membership to database
            memberships.push(newMembership);
            this.db.setTable('team_memberships', memberships);

            this.showMessage(`Successfully joined ${team.name}!`, 'success');
            modal.remove();
            
            // Refresh the team management card
            this.render();
        } catch (error) {
            console.error('Error joining team:', error);
            this.showMessage('Error joining team. Please try again.', 'error');
        }
    }

    leaveTeam(teamId, teamName, membershipId) {
        if (!confirm(`Are you sure you want to leave ${teamName}? This action cannot be undone.`)) {
            return;
        }

        try {
            const memberships = this.db.getTable('team_memberships');
            const updatedMemberships = memberships.filter(m => m.id !== membershipId);
            
            this.db.setTable('team_memberships', updatedMemberships);
            
            this.showMessage(`Successfully left ${teamName}`, 'success');
            
            // Refresh the team management card
            this.render();
        } catch (error) {
            console.error('Error leaving team:', error);
            this.showMessage('Error leaving team. Please try again.', 'error');
        }
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.profileApp = new ProfileApp();
});
