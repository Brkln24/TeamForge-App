/**
 * File Name: manager.js
 * Purpose: Handles team overview, player analytics, lineup creation with intelligent suggestions, 
 *          and advanced team administration features.
 * Date Created: 7th August 2025
 * Last Modified: 25th August 2025
    */
class ManagerApp {
    constructor() {
        this.currentView = 'team-selection'; // team-selection, dashboard, notes, lineup-creator
        this.selectedTeam = null;
        this.selectedPlayer = null;
        this.currentUser = null;
        this.teams = [];
        this.teamPlayers = [];
        this.teamNotes = [];
        this.lineups = [];
        this.currentLineup = null;
        
        this.init();
    }

    /**
     * PURPOSE: Initializes the manager application with authentication, team loading, and view rendering
     * 
     * INPUTS: None (uses global window.db and window.navManager)
     * 
     * OUTPUTS:
     * - User authentication verification and redirect if needed
     * - Complete team data loaded for current user
     * - Initial view rendered (team selection or dashboard)
     * - Auto-selection of single team if applicable
     * 
     * JUSTIFICATION: This initialization method ensures proper security validation,
     * handles dependency loading gracefully, and provides an optimized user experience
     * by auto-selecting teams when only one is available. Error handling prevents
     * application crashes during startup.
     * 
     * FUTURE ENHANCEMENTS:
     * - Add loading indicators during initialization
     * - Implement offline mode detection and handling
     * - Add progressive loading for large team datasets
     */
    async init() {
        try {
            // Wait for database and navigation to be ready
            if (!window.db) {
                setTimeout(() => this.init(), 100);
                return;
            }

            // Wait for navigation to be initialized
            if (!window.navManager) {
                setTimeout(() => this.init(), 100);
                return;
            }

            // Get current user
            this.currentUser = window.db.getCurrentUser();
            if (!this.currentUser) {
                window.location.href = 'login.html';
                return;
            }

            // Load user's teams
            await this.loadUserTeams();
            
            // Render initial view
            this.render();
            
        } catch (error) {
            console.error('Error initializing manager app:', error);
            this.showError('Failed to load manager data');
        }
    }

    // Load all teams associated with current user account
    async loadUserTeams() {
        this.teams = window.db.getUserTeams(this.currentUser.id);
        
        // If user has only one team, auto-select it
        if (this.teams.length === 1) {
            await this.selectTeam(this.teams[0].id);
        }
    }

    // Select a team and transition to dashboard view with data loading
    async selectTeam(teamId) {
        const team = this.teams.find(t => t.id === teamId);
        if (!team) return;
        
        this.selectedTeam = team;
        
        // Load team data
        await this.loadTeamData();
        
        // Switch to dashboard view
        this.currentView = 'dashboard';
        this.render();
    }

    /**
     * PURPOSE: Loads comprehensive team data including players, notes, lineups, and statistics
     * 
     * INPUTS: None (uses this.selectedTeam.id from current state)
     * 
     * OUTPUTS:
     * - this.teamPlayers: Array of team members with formatted data
     * - this.teamNotes: Recent communication messages
     * - this.lineups: Team lineups and formations
     * - Complete team context loaded for management interface
     * 
     * JUSTIFICATION: Centralizing team data loading ensures consistency across all
     * manager views and provides a single point for data refresh. The method handles
     * data transformation and formatting to optimize UI rendering performance.
     * 
     * FUTURE ENHANCEMENTS:
     * - Add data caching to reduce database calls
     * - Implement incremental loading for large datasets
     * - Add real-time data synchronization
     */
    async loadTeamData() {
        if (!this.selectedTeam) return;
        
        const teamId = this.selectedTeam.id;
        
        // Load team players
        const teamMembers = window.db.getTeamMembers(teamId);
        this.teamPlayers = teamMembers
            .filter(member => member.role === 'player')
            .map(member => ({
                id: member.id,
                name: `${member.first_name} ${member.last_name}`,
                initials: `${member.first_name[0]}${member.last_name[0]}`,
                number: member.membership?.jersey_number || Math.floor(Math.random() * 99) + 1,
                position: member.membership?.position || 'G'
            }));

        // Load team notes
        this.loadTeamNotes();
        
        // Load team lineups
        this.loadTeamLineups();
    }

    // Load recent team communication messages for current user
    loadTeamNotes() {
        // Get recent messages for the current user (similar to profile page)
        this.teamNotes = this.getRecentMessages();
    }

    // Retrieve and format recent messages for display in notes preview
    getRecentMessages() {
        try {
            const currentUser = this.currentUser;
            if (!currentUser) return [];

            const notes = window.db.getTable('notes') || [];
            console.log('Manager - All notes in database:', notes);
            console.log('Manager - Current user ID:', currentUser.id);
            
            // Check both old and new field structures to be compatible
            const userMessages = notes.filter(note => {
                // Check new structure first (author_id/recipient_id)
                const newStructureMatch = note.recipient_id === currentUser.id && note.author_id !== currentUser.id;
                // Check old structure as fallback (fromUserId/toUserId)
                const oldStructureMatch = note.toUserId === currentUser.id && note.fromUserId !== currentUser.id;
                
                console.log(`Manager - Note ${note.id}:`, {
                    author_id: note.author_id,
                    recipient_id: note.recipient_id,
                    fromUserId: note.fromUserId,
                    toUserId: note.toUserId,
                    newStructureMatch,
                    oldStructureMatch
                });
                
                return newStructureMatch || oldStructureMatch;
            });

            console.log('Manager - Filtered user messages:', userMessages);

            // Sort by timestamp (newest first) and take recent messages
            const recentMessages = userMessages
                .sort((a, b) => new Date(b.created_at || b.timestamp) - new Date(a.created_at || a.timestamp))
                .slice(0, 3) // Match profile.js limit of 3
                .map(note => ({
                    id: note.id,
                    author: this.getSenderName(note.author_id || note.fromUserId),
                    authorInitials: this.getSenderInitials(note.author_id || note.fromUserId),
                    message: note.content,
                    timestamp: note.created_at || note.timestamp,
                    isFromCurrentUser: (note.author_id || note.fromUserId) === currentUser.id,
                    fromUserId: note.author_id || note.fromUserId, // For compatibility with reply functionality
                    toUserId: note.recipient_id || note.toUserId
                }));
                
            console.log('Manager - Final recent messages:', recentMessages);
            return recentMessages;
        } catch (error) {
            console.error('Error fetching recent messages:', error);
            return [];
        }
    }

    // Get display name for message sender from user database
    getSenderName(senderId) {
        try {
            const users = window.db.getTable('users') || [];
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

    // Generate initials for message sender display avatars
    getSenderInitials(senderId) {
        try {
            const users = window.db.getTable('users') || [];
            const user = users.find(u => u.id === senderId);
            if (!user) return 'U';
            
            const firstName = user.first_name || user.username?.charAt(0) || 'U';
            const lastName = user.last_name || 'U';
            
            return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
        } catch (error) {
            return 'U';
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

    // Navigate to notes page with specific user pre-selected for reply
    replyToMessage(userId, userName) {
        // Navigate to notes page with the specific user selected
        const notesUrl = `notes.html?selectUser=${encodeURIComponent(userId)}&userName=${encodeURIComponent(userName)}`;
        window.location.href = notesUrl;
    }

    // Attach event listeners to reply buttons in notes section
    setupNotesReplyButtons() {
        // Add event listeners to all reply buttons in the notes section
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

    // Load team lineups from database or create default formations
    loadTeamLineups() {
        // Get lineups from database
        this.lineups = window.db.getTeamLineups(this.selectedTeam.id);
        
        // If no lineups exist, create default ones
        if (this.lineups.length === 0) {
            const defaultLineups = [
                { name: 'Starters', selectedPlayers: [] },
                { name: 'Bench', selectedPlayers: [] },
                { name: 'Lineup 1', selectedPlayers: [] },
                { name: 'Lineup 2', selectedPlayers: [] },
                { name: 'Lineup 3', selectedPlayers: [] }
            ];
            
            defaultLineups.forEach(lineup => {
                this.lineups.push(window.db.createLineup({
                    team_id: this.selectedTeam.id,
                    name: lineup.name,
                    selectedPlayers: lineup.selectedPlayers
                }));
            });
        }

        // Ensure all lineups have selectedPlayers array
        this.lineups.forEach(lineup => {
            if (!lineup.selectedPlayers) {
                lineup.selectedPlayers = [];
            }
        });
    }

    // Save current lineup changes to database
    saveTeamLineups() {
        // Lineups are automatically saved to database when modified
        if (this.currentLineup) {
            window.db.updateLineup(this.currentLineup.id, {
                positions: this.currentLineup.positions
            });
        }
    }

    /**
     * PURPOSE: Renders the complete manager interface based on current view state
     * 
     * INPUTS: None (uses this.currentView and application state)
     * 
     * OUTPUTS:
     * - HTML content injected into manager-content container
     * - View-specific interface rendered (team-selection, dashboard, notes, lineup-creator)
     * - Event listeners attached where applicable
     * 
     * JUSTIFICATION: This centralized rendering method provides consistent view
     * management and ensures proper state synchronization across different manager
     * interfaces. The switch-based approach allows for easy addition of new views.
     * 
     * FUTURE ENHANCEMENTS:
     * - Add view transition animations
     * - Implement lazy loading for complex views
     * - Add view state persistence for navigation history
     */
    render() {
        const container = document.getElementById('manager-content');
        if (!container) return;

        switch (this.currentView) {
            case 'team-selection':
                container.innerHTML = this.renderTeamSelection();
                break;
            case 'dashboard':
                container.innerHTML = this.renderDashboard();
                this.setupNotesReplyButtons(); // Setup reply buttons for dashboard notes
                break;
            case 'notes':
                container.innerHTML = this.renderNotes();
                this.setupNotesEventListeners();
                break;
            case 'lineup-creator':
                container.innerHTML = this.renderLineupCreator();
                this.setupLineupEventListeners();
                break;
            default:
                container.innerHTML = this.renderTeamSelection();
        }
    }

    // Generate HTML for team selection interface with team management options
    renderTeamSelection() {
        if (this.teams.length === 0) {
            return `
                <div class="team-selection">
                    <h2>No Teams Available</h2>
                    <p>You are not currently assigned to any teams.</p>
                    <p>Contact your administrator to be added to a team.</p>
                </div>
            `;
        }

        return `
            <div class="team-selection">
                <div class="team-selector-header">
                    <h2>Select Team</h2>
                    <button class="new-team-btn" onclick="managerApp.createNewTeam()">New Team</button>
                </div>
                
                <div class="teams-list">
                    ${this.teams.map(team => `
                        <div class="team-item">
                            <div class="team-info-left">
                                <div class="team-logo" style="background-color: ${team.color || '#6366f1'}">
                                    ${team.logo || '<i class="bi bi-trophy-fill"></i>'}
                                </div>
                                <div class="team-details">
                                    <h3>${team.name}</h3>
                                    <p>${team.league || 'Basketball League'} • ${team.season || '2024-25'}</p>
                                </div>
                            </div>
                            <div class="team-actions">
                                <button class="select-team-btn" onclick="managerApp.selectTeam('${team.id}')">
                                    Select Team
                                </button>
                                <button class="delete-team-btn" onclick="managerApp.deleteTeam('${team.id}')" title="Delete Team">
                                    ✕
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * PURPOSE: Generates comprehensive dashboard HTML with statistics, lineups, and team management
     * 
     * INPUTS: None (uses team data from current state)
     * 
     * OUTPUTS:
     * - Complete dashboard HTML with team statistics
     * - Lineup management interface
     * - Team communication preview
     * - Team management action buttons
     * 
     * JUSTIFICATION: The dashboard serves as the central hub for all manager activities,
     * providing quick access to key metrics and actions. The layout is optimized for
     * rapid decision-making and efficient team management workflows.
     * 
     * FUTURE ENHANCEMENTS:
     * - Add customizable dashboard widgets
     * - Implement real-time statistic updates
     * - Add team performance analytics and trends
     */
    renderDashboard() {
        const recentNotes = this.teamNotes.slice(0, 2);
        const teamStats = this.getTeamStats();
        
        return `
            <div class="manager-dashboard-view">
                <button class="back-btn" onclick="managerApp.goToTeamSelection()">
                    ← Back to Teams
                </button>
                
                <h2>Manager Dashboard - ${this.selectedTeam.name}</h2>
                
                <!-- Team Statistics -->
                <div class="dashboard-stats">
                    <div class="stat-card">
                        <div class="stat-number">${teamStats.totalPlayers}</div>
                        <div class="stat-label">Total Players</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${teamStats.totalLineups}</div>
                        <div class="stat-label">Active Lineups</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${teamStats.gamesToConfirm}</div>
                        <div class="stat-label">Games to Confirm</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${teamStats.upcomingGames}</div>
                        <div class="stat-label">Upcoming Games</div>
                    </div>
                </div>
                
                <div class="manager-dashboard">
                    <!-- Lineups Section -->
                    <div class="dashboard-section">
                        <h3 class="section-title"><i class="bi bi-basketball"></i> Lineups</h3>
                        
                        <div class="lineup-item">
                            <div>
                                <div class="lineup-name">Starters Lineup</div>
                                <div class="lineup-info">${this.getLineupInfo('starters')}</div>
                            </div>
                            <div class="lineup-actions">
                                <button class="btn-small btn-view" onclick="managerApp.goToLineupCreator()">View</button>
                                <button class="btn-small btn-edit" onclick="managerApp.goToLineupCreator()">Edit</button>
                            </div>
                        </div>
                        
                        <div class="lineup-item">
                            <div>
                                <div class="lineup-name">Bench Lineup</div>
                                <div class="lineup-info">${this.getLineupInfo('bench')}</div>
                            </div>
                            <div class="lineup-actions">
                                <button class="btn-small btn-view" onclick="managerApp.goToLineupCreator()">View</button>
                                <button class="btn-small btn-edit" onclick="managerApp.goToLineupCreator()">Edit</button>
                            </div>
                        </div>
                        
                        <div class="lineup-item">
                            <div>
                                <div class="lineup-name">Create New Lineup</div>
                                <div class="lineup-info">Build custom formations</div>
                            </div>
                            <div class="lineup-actions">
                                <button class="btn-small btn-create" onclick="managerApp.goToLineupCreator()">Create</button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Edit Team Section -->
                    <div class="dashboard-section">
                        <h3 class="section-title"><i class="bi bi-gear-fill"></i> Team Management</h3>
                        
                        <button class="team-action-btn" onclick="managerApp.editTeamDetails()">
                            <span><i class="bi bi-pencil-fill"></i> Edit Team Details</span>
                        </button>
                        
                        <button class="team-action-btn" onclick="managerApp.inviteUsers()">
                            <span><i class="bi bi-envelope-fill"></i> Invite Users</span>
                        </button>
                        
                        <button class="team-action-btn" onclick="managerApp.archiveUsers()">
                            <span>📦 Archive Users</span>
                        </button>
                    </div>
                    
                    <!-- Notes Preview Section -->
                    <div class="dashboard-section notes-preview">
                        <h3 class="section-title"><i class="bi bi-chat-dots-fill"></i> Team Communication</h3>
                        
                        <div class="notes-list">
                            ${recentNotes.length > 0 ? recentNotes.map(note => `
                                <div class="note-item">
                                    <div class="note-content">
                                        <div class="note-header">
                                            <div class="note-author">${note.author}</div>
                                            <div class="note-actions">
                                                <span class="note-time">${this.formatTime(note.timestamp)}</span>
                                                <button class="reply-btn" data-user-id="${note.fromUserId}" data-user-name="${note.author}">
                                                    Reply
                                                </button>
                                            </div>
                                        </div>
                                        <div class="note-message">${note.message.length > 80 ? note.message.substring(0, 80) + '...' : note.message}</div>
                                    </div>
                                </div>
                            `).join('') : '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">No messages yet. Start the conversation!</p>'}
                        </div>
                        
                        <button class="go-to-notes-btn" onclick="managerApp.goToNotes()">
                            <i class="bi bi-chat-dots-fill"></i> Go to Notes
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Generate HTML for team communication interface with player chat
    renderNotes() {
        return `
            <div class="notes-view">
                <button class="back-btn" onclick="managerApp.goToDashboard()">
                    ← Back to Dashboard
                </button>
                
                <h2>Team Communication</h2>
                
                <div class="notes-layout">
                    <!-- Players Sidebar -->
                    <div class="players-sidebar">
                        <h3>Team Members</h3>
                        <div class="players-list">
                            ${this.teamPlayers.map(player => `
                                <div class="player-item ${this.selectedPlayer?.id === player.id ? 'active' : ''}" 
                                     onclick="managerApp.selectPlayerForChat('${player.id}')">
                                    ${player.name}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- Chat Area -->
                    <div class="chat-area">
                        <div class="chat-header">
                            <h3>${this.selectedPlayer ? this.selectedPlayer.name : 'Select a player'}</h3>
                            ${this.selectedPlayer ? '<div class="coach-badge">Your Dad is the Best Coach ever!</div>' : ''}
                        </div>
                        
                        <div class="messages-container" id="messages-container">
                            ${this.renderMessages()}
                        </div>
                        
                        <div class="message-input-area">
                            <input type="text" class="message-input" id="message-input" 
                                   placeholder="Type your message..." 
                                   ${!this.selectedPlayer ? 'disabled' : ''}>
                            <button class="send-btn" onclick="managerApp.sendMessage()" 
                                    ${!this.selectedPlayer ? 'disabled' : ''}>
                                ➤
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Render chat messages for selected player conversation
    renderMessages() {
        if (!this.selectedPlayer) {
            return '<div style="text-align: center; color: var(--text-secondary); padding: 2rem;">Select a player to start chatting</div>';
        }
        
        // Get messages for selected player
        const playerMessages = window.db.getTeamMessages(this.selectedTeam.id, this.selectedPlayer.id);
        
        if (playerMessages.length === 0) {
            return '<div style="text-align: center; color: var(--text-secondary); padding: 2rem;">No messages yet. Start the conversation!</div>';
        }
        
        return playerMessages.map(message => `
            <div class="message ${message.author_id === this.currentUser.id ? 'sent' : 'received'}">
                ${message.content}
            </div>
        `).join('');
    }

    /**
     * PURPOSE: Creates comprehensive lineup creator interface with intelligent suggestions
     * 
     * INPUTS: None (uses current lineup and team player data)
     * 
     * OUTPUTS:
     * - Complete lineup creation interface with drag-and-drop functionality
     * - Player roster with statistics and position information
     * - Smart suggestion system based on player performance
     * - Lineup tabs for multiple formation management
     * 
     * JUSTIFICATION: The lineup creator is essential for strategic team management,
     * providing both manual control and intelligent automation. The interface combines
     * intuitive design with advanced analytics to support optimal team formation.
     * 
     * FUTURE ENHANCEMENTS:
     * - Add formation templates and tactical presets
     * - Implement opponent-specific lineup recommendations
     * - Add visual formation diagrams and court positioning
     */
    renderLineupCreator() {
        const currentLineupName = this.currentLineup ? this.currentLineup.name : '';
        
        return `
            <div class="lineup-creator-view">
                <button class="back-btn" onclick="managerApp.goToDashboard()">
                    ← Back to Dashboard
                </button>
                
                <h2><i class="bi bi-diagram-3-fill"></i> Lineup Creator</h2>
                
                <div class="lineup-creator-layout">
                    <!-- Left Sidebar - Lineup Tabs -->
                    <div class="lineup-tabs">
                        ${this.lineups.map(lineup => `
                            <div class="lineup-tab ${this.currentLineup?.id === lineup.id ? 'active' : ''}" 
                                 onclick="managerApp.selectLineup('${lineup.id}')">
                                ${lineup.name}
                            </div>
                        `).join('')}
                        <div class="lineup-tab new-lineup-tab" onclick="managerApp.createNewLineup()">
                            New Lineup
                        </div>
                    </div>
                    
                    <!-- Center Area - Roster -->
                    <div class="lineup-main">
                        <!-- Name Input Section -->
                        <div class="lineup-name-section">
                            <label class="lineup-name-label">Name:</label>
                            <input type="text" class="lineup-name-input" 
                                   value="${currentLineupName}" 
                                   placeholder="Enter lineup name..."
                                   onchange="managerApp.updateLineupName(this.value)">
                        </div>
                        
                        <!-- Roster Section -->
                        <div class="roster-section">
                            <h3 class="roster-title">Roster</h3>
                            <div class="roster-list">
                                ${this.teamPlayers.map(player => {
                                    // Get player stats for display
                                    const averages = window.db.calculatePlayerAverages(player.id);
                                    const statsText = `${averages.ppg}/${averages.rpg}/${averages.apg}`;
                                    
                                    return `
                                        <div class="roster-player ${this.isPlayerInCurrentLineup(player.id) ? 'selected' : ''}" 
                                             draggable="true"
                                             data-player-id="${player.id}"
                                             onclick="managerApp.togglePlayerInLineup('${player.id}')">
                                            <div class="player-avatar">👤</div>
                                            <div class="player-details">
                                                <div class="player-name">${player.name}</div>
                                                <div class="player-position">${player.position}</div>
                                                <div class="player-stats">${statsText} (PPG/RPG/APG)</div>
                                            </div>
                                            ${this.isPlayerInCurrentLineup(player.id) ? 
                                                '<div class="remove-icon" onclick="managerApp.removePlayerFromLineup(\'' + player.id + '\'); event.stopPropagation();">⊖</div>' : 
                                                ''
                                            }
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                        
                        <!-- Action Buttons -->
                        <div class="lineup-actions-bar">
                            <button class="action-btn btn-cancel" onclick="managerApp.cancelLineupChanges()">Cancel</button>
                            <button class="action-btn btn-create" onclick="managerApp.saveCurrentLineup()">Create</button>
                        </div>
                    </div>
                    
                    <!-- Right Panel - Lineup List -->
                    <div class="lineup-list-panel">
                        <div class="lineup-list-header">
                            <div class="lineup-list-title">Smart Suggestions:</div>
                            <select class="suggest-dropdown">
                                <option value="">Choose Strategy</option>
                                <option value="balanced">⚖️ Balanced (All-around)</option>
                                <option value="offensive">⚡ Offensive (High scoring)</option>
                                <option value="defensive">🛡️ Defensive (Strong defense)</option>
                            </select>
                            <button class="suggest-btn" onclick="managerApp.applySuggestion()" title="Apply suggestion based on player statistics">
                                <i class="bi bi-lightbulb-fill"></i> Apply
                            </button>
                        </div>
                        
                        <div class="lineup-positions">
                            ${this.getSelectedPlayers().map((player, index) => `
                                <div class="lineup-position ${player ? 'filled' : ''}">
                                    <div class="position-number">${index + 1}</div>
                                    <div class="position-info">
                                        <div class="position-label">${player ? player.name : ''}</div>
                                        <div class="assigned-player">${player ? player.position : ''}</div>
                                    </div>
                                </div>
                            `).join('')}
                            
                            ${Array.from({length: Math.max(0, 5 - this.getSelectedPlayers().length)}, (_, index) => `
                                <div class="lineup-position">
                                    <div class="position-number">${this.getSelectedPlayers().length + index + 1}</div>
                                    <div class="position-info">
                                        <div class="position-label"></div>
                                        <div class="assigned-player"></div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getPlayerInPosition(position) {
        if (!this.currentLineup || !this.currentLineup.positions[position]) {
            return position;
        }
        
        const player = this.teamPlayers.find(p => p.id === this.currentLineup.positions[position]);
        return player ? player.initials : position;
    }

    isPositionFilled(position) {
        return this.currentLineup && 
               this.currentLineup.positions[position] && 
               this.teamPlayers.find(p => p.id === this.currentLineup.positions[position]);
    }

    getPlayerForPosition(position) {
        if (!this.currentLineup || !this.currentLineup.positions[position]) {
            return null;
        }
        
        return this.teamPlayers.find(p => p.id === this.currentLineup.positions[position]);
    }

    // New methods for wireframe-based lineup creator
    // Check if player is currently selected in active lineup
    isPlayerInCurrentLineup(playerId) {
        if (!this.currentLineup || !this.currentLineup.selectedPlayers) {
            return false;
        }
        return this.currentLineup.selectedPlayers.includes(playerId);
    }

    // Get array of players currently selected in active lineup
    getSelectedPlayers() {
        if (!this.currentLineup || !this.currentLineup.selectedPlayers) {
            return [];
        }
        
        return this.currentLineup.selectedPlayers
            .map(playerId => this.teamPlayers.find(p => p.id === playerId))
            .filter(player => player); // Remove any null values
    }

    // Toggle player inclusion in current lineup selection
    togglePlayerInLineup(playerId) {
        if (!this.currentLineup) {
            this.currentLineup = this.lineups[0] || this.createEmptyLineup();
        }

        if (!this.currentLineup.selectedPlayers) {
            this.currentLineup.selectedPlayers = [];
        }

        const index = this.currentLineup.selectedPlayers.indexOf(playerId);
        if (index > -1) {
            // Remove player
            this.currentLineup.selectedPlayers.splice(index, 1);
        } else {
            // Add player (max 5 players)
            if (this.currentLineup.selectedPlayers.length < 5) {
                this.currentLineup.selectedPlayers.push(playerId);
            } else {
                alert('Maximum 5 players allowed in a lineup!');
                return;
            }
        }

        this.render();
    }

    // Remove specific player from current lineup
    removePlayerFromLineup(playerId) {
        if (!this.currentLineup || !this.currentLineup.selectedPlayers) return;
        
        const index = this.currentLineup.selectedPlayers.indexOf(playerId);
        if (index > -1) {
            this.currentLineup.selectedPlayers.splice(index, 1);
            this.render();
        }
    }

    // Update lineup name in current selection
    updateLineupName(newName) {
        if (this.currentLineup) {
            this.currentLineup.name = newName;
        }
    }

    // Save current lineup to database with validation
    saveCurrentLineup() {
        if (!this.currentLineup) {
            alert('No lineup to save!');
            return;
        }

        if (!this.currentLineup.name || this.currentLineup.name.trim() === '') {
            alert('Please enter a lineup name!');
            return;
        }

        // Update or create lineup in database
        if (this.currentLineup.id) {
            window.db.updateLineup(this.currentLineup.id, {
                name: this.currentLineup.name,
                selectedPlayers: this.currentLineup.selectedPlayers || []
            });
        } else {
            const newLineup = window.db.createLineup({
                team_id: this.selectedTeam.id,
                name: this.currentLineup.name,
                selectedPlayers: this.currentLineup.selectedPlayers || []
            });
            this.lineups.push(newLineup);
            this.currentLineup = newLineup;
        }

        alert('Lineup saved successfully!');
        this.loadTeamLineups();
        this.render();
    }

    // Cancel lineup changes and return to dashboard
    cancelLineupChanges() {
        if (confirm('Cancel changes and go back to dashboard?')) {
            this.goToDashboard();
        }
    }

    /**
     * PURPOSE: Generates intelligent lineup suggestions based on strategy and player statistics
     * 
     * INPUTS: None (uses selected suggestion type from dropdown and player statistics)
     * 
     * OUTPUTS:
     * - Optimized player selection based on chosen strategy
     * - Updated lineup with strategic player positioning
     * - Detailed feedback on suggestion rationale
     * - Real-time lineup update and rendering
     * 
     * JUSTIFICATION: Intelligent lineup suggestions leverage statistical analysis to
     * optimize team performance for specific game situations. This feature reduces
     * decision-making time while ensuring strategic coherence and player utilization.
     * 
     * FUTURE ENHANCEMENTS:
     * - Add machine learning for historical performance analysis
     * - Implement opponent-specific strategic recommendations
     * - Add fatigue and injury considerations to suggestions
     */
    applySuggestion() {
        const dropdown = document.querySelector('.suggest-dropdown');
        const suggestionType = dropdown.value;
        
        if (!suggestionType) {
            alert('Please select a suggestion type!');
            return;
        }

        if (!this.currentLineup) {
            this.currentLineup = this.createEmptyLineup();
        }

        // Get player stats for intelligent suggestions
        const playersWithStats = this.getPlayersWithStats();
        
        if (playersWithStats.length === 0) {
            alert('No player statistics available for suggestions. Players need to have game stats recorded first.');
            return;
        }
        
        let selectedPlayers = [];
        let suggestionDescription = '';

        switch (suggestionType) {
            case 'balanced':
                selectedPlayers = this.getBalancedLineup(playersWithStats);
                suggestionDescription = 'Selected players with the best overall ratings, balancing scoring, defense, and playmaking.';
                break;
            case 'offensive':
                selectedPlayers = this.getOffensiveLineup(playersWithStats);
                suggestionDescription = 'Selected top scorers and playmakers for maximum offensive output.';
                break;
            case 'defensive':
                selectedPlayers = this.getDefensiveLineup(playersWithStats);
                suggestionDescription = 'Selected players with the best defensive stats (steals, blocks, rebounds).';
                break;
        }

        if (selectedPlayers.length === 0) {
            alert('Unable to generate suggestions. Please ensure players have recorded game statistics.');
            return;
        }

        this.currentLineup.selectedPlayers = selectedPlayers.map(p => p.id);
        this.render();
        
        // Show detailed feedback
        const playerNames = selectedPlayers.map(p => p.name).join(', ');
        alert(`${suggestionType.charAt(0).toUpperCase() + suggestionType.slice(1)} lineup applied!\n\nSelected: ${playerNames}\n\n${suggestionDescription}`);
    }

    // Create empty lineup template for new formations
    createEmptyLineup() {
        return {
            id: null,
            name: '',
            selectedPlayers: [],
            team_id: this.selectedTeam.id
        };
    }

    // Get players with their statistics for intelligent lineup suggestions
    // Get team players enhanced with statistical data for analysis
    getPlayersWithStats() {
        return this.teamPlayers.map(player => {
            const averages = window.db.calculatePlayerAverages(player.id);
            const seasonStats = window.db.getPlayerSeasonStats(player.id);
            
            return {
                ...player,
                averages: averages,
                seasonStats: seasonStats,
                efficiency: this.calculatePlayerEfficiency(averages),
                overallRating: this.calculateOverallRating(averages)
            };
        });
    }

    // Calculate efficiency rating for a player
    // Calculate efficiency rating based on comprehensive statistics
    calculatePlayerEfficiency(averages) {
        // Efficiency formula: (PTS + REB + AST + STL + BLK - TO) weighted by impact
        return Math.round(
            (averages.ppg * 1.0) + 
            (averages.rpg * 2) + 
            (averages.apg * 2) + 
            (averages.spg * 3) + 
            (averages.bpg * 3) - 
            (averages.tpg * 3)
        );
    }

    // Calculate overall rating combining multiple factors
    // Calculate weighted overall rating for player comparison
    calculateOverallRating(averages) {
        // Weight different stats based on importance
        const scoring = averages.ppg * 0.25;
        const rebounding = averages.rpg * 0.20;
        const playmaking = averages.apg * 0.25;
        const defense = (averages.spg + averages.bpg) * 0.15;
        const shooting = averages.fg_percent * 0.10;
        const turnovers = averages.tpg * -0.05; // Negative weight for turnovers
        
        return Math.round((scoring + rebounding + playmaking + defense + shooting + turnovers) * 10) / 10;
    }

    // Get balanced lineup - mix of scoring, defense, and playmaking
    // Generate balanced lineup mixing scoring, defense, and playmaking
    getBalancedLineup(playersWithStats) {
        if (playersWithStats.length === 0) return [];
        
        // Sort by overall rating
        const sortedPlayers = [...playersWithStats].sort((a, b) => b.overallRating - a.overallRating);
        
        // Try to get a balanced mix
        const selectedPlayers = [];
        let scorers = 0;
        let defenders = 0;
        let playmakers = 0;
        
        for (const player of sortedPlayers) {
            if (selectedPlayers.length >= 5) break;
            
            const isScorer = player.averages.ppg >= 8;
            const isDefender = (player.averages.spg + player.averages.bpg) >= 1.5;
            const isPlaymaker = player.averages.apg >= 3;
            
            // Prioritize getting at least one of each type
            if ((isScorer && scorers < 2) || 
                (isDefender && defenders < 2) || 
                (isPlaymaker && playmakers < 1) ||
                selectedPlayers.length < 3) {
                
                selectedPlayers.push(player);
                if (isScorer) scorers++;
                if (isDefender) defenders++;
                if (isPlaymaker) playmakers++;
            }
        }
        
        // Fill remaining spots with best available
        while (selectedPlayers.length < 5 && selectedPlayers.length < playersWithStats.length) {
            const remaining = sortedPlayers.filter(p => !selectedPlayers.includes(p));
            if (remaining.length > 0) {
                selectedPlayers.push(remaining[0]);
            } else {
                break;
            }
        }
        
        return selectedPlayers.slice(0, 5);
    }

    // Get offensive lineup - prioritize scoring and shooting
    // Generate offensive-focused lineup prioritizing scoring ability
    getOffensiveLineup(playersWithStats) {
        if (playersWithStats.length === 0) return [];
        
        // Create offensive rating: PPG * 2 + APG * 1.5 + FG% * 0.1
        const playersWithOffensiveRating = playersWithStats.map(player => ({
            ...player,
            offensiveRating: (player.averages.ppg * 2.0) + 
                           (player.averages.apg * 1.5) + 
                           (player.averages.fg_percent * 0.1) +
                           (player.averages.three_percent * 0.05)
        }));
        
        // Sort by offensive rating and take top 5
        return playersWithOffensiveRating
            .sort((a, b) => b.offensiveRating - a.offensiveRating)
            .slice(0, 5);
    }

    // Get defensive lineup - prioritize steals, blocks, and rebounds
    // Generate defensive-focused lineup prioritizing steals, blocks, rebounds
    getDefensiveLineup(playersWithStats) {
        if (playersWithStats.length === 0) return [];
        
        // Create defensive rating: (STL + BLK) * 3 + REB * 1.5 - TO * 1
        const playersWithDefensiveRating = playersWithStats.map(player => ({
            ...player,
            defensiveRating: ((player.averages.spg + player.averages.bpg) * 3.0) + 
                           (player.averages.rpg * 1.5) - 
                           (player.averages.tpg * 1.0)
        }));
        
        // Sort by defensive rating and take top 5
        return playersWithDefensiveRating
            .sort((a, b) => b.defensiveRating - a.defensiveRating)
            .slice(0, 5);
    }

    // Event Handlers
    setupNotesEventListeners() {
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
            });
        }
    }

    setupLineupEventListeners() {
        // Setup drag and drop for roster players
        const rosterPlayers = document.querySelectorAll('.roster-player');
        rosterPlayers.forEach(player => {
            player.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', e.target.dataset.playerId || e.target.closest('.roster-player').dataset.playerId);
            });
        });

        // Setup drop zones for lineup positions
        const lineupPositions = document.querySelectorAll('.lineup-position');
        lineupPositions.forEach(position => {
            position.addEventListener('dragover', (e) => {
                e.preventDefault();
                position.style.backgroundColor = 'rgba(49, 130, 206, 0.3)';
            });

            position.addEventListener('dragleave', (e) => {
                position.style.backgroundColor = '';
            });

            position.addEventListener('drop', (e) => {
                e.preventDefault();
                const playerId = e.dataTransfer.getData('text/plain');
                if (playerId) {
                    this.togglePlayerInLineup(playerId);
                }
                position.style.backgroundColor = '';
            });
        });
    }

    // Navigation Methods
    // Navigate back to team selection view
    goToTeamSelection() {
        this.currentView = 'team-selection';
        this.selectedTeam = null;
        this.render();
    }

    // Navigate to main dashboard view
    goToDashboard() {
        this.currentView = 'dashboard';
        this.render();
    }

    // Navigate to dedicated notes page
    goToNotes() {
        // Navigate to the dedicated notes page
        window.location.href = 'notes.html';
    }

    // Navigate to lineup creator with default lineup selection
    goToLineupCreator() {
        this.currentView = 'lineup-creator';
        if (!this.currentLineup && this.lineups.length > 0) {
            this.currentLineup = this.lineups[0];
        }
        this.render();
    }

    // Team Management Methods
    // Create modal interface for new team creation
    createNewTeam() {
        // Create modal for creating new team
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Create New Team</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <form id="create-team-form">
                    <div class="form-group">
                        <label>Team Name</label>
                        <input type="text" name="team_name" placeholder="Enter team name..." required>
                    </div>
                    <div class="form-group">
                        <label>League</label>
                        <select name="league" required>
                            <option value="">Select League</option>
                            <option value="NBL">NBL (National Basketball League)</option>
                            <option value="WNBL">WNBL (Women's National Basketball League)</option>
                            <option value="NBL1">NBL1 (Semi-Professional)</option>
                            <option value="State League">State League</option>
                            <option value="Regional League">Regional League</option>
                            <option value="School Basketball">School Basketball</option>
                            <option value="Youth League">Youth League</option>
                            <option value="Social League">Social League</option>
                            <option value="Custom League">Custom League</option>
                        </select>
                    </div>
                    <div class="form-group" id="custom-league-group" style="display: none;">
                        <label>Custom League Name</label>
                        <input type="text" name="custom_league" placeholder="Enter custom league name...">
                    </div>
                    <div class="form-group">
                        <label>Season</label>
                        <input type="text" name="season" value="2024-25" placeholder="e.g., 2024-25">
                    </div>
                    <div class="form-group">
                        <label>Team Color</label>
                        <input type="color" name="team_color" value="#6366f1">
                    </div>
                    <div class="form-group">
                        <label>Team Logo (Emoji)</label>
                        <input type="text" name="team_logo" value="<i class='bi bi-trophy-fill'></i>" maxlength="50" placeholder="<i class='bi bi-trophy-fill'></i>">
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-cancel" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                        <button type="submit" class="btn-save">Create Team</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle league selection change
        const leagueSelect = modal.querySelector('select[name="league"]');
        const customLeagueGroup = modal.querySelector('#custom-league-group');
        
        leagueSelect.addEventListener('change', (e) => {
            if (e.target.value === 'Custom League') {
                customLeagueGroup.style.display = 'block';
                customLeagueGroup.querySelector('input').required = true;
            } else {
                customLeagueGroup.style.display = 'none';
                customLeagueGroup.querySelector('input').required = false;
            }
        });

        // Handle form submission
        const form = document.getElementById('create-team-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            
            try {
                let leagueName = formData.get('league');
                if (leagueName === 'Custom League') {
                    leagueName = formData.get('custom_league');
                }
                
                // Create new team in database
                const newTeam = {
                    name: formData.get('team_name'),
                    league: leagueName,
                    season: formData.get('season'),
                    color: formData.get('team_color'),
                    logo: formData.get('team_logo')
                };
                
                const team = window.db.createTeam(newTeam);
                
                // Add current user with their actual role (coach stays coach, manager stays manager)
                const userRole = this.currentUser.role || 'manager';
                window.db.addTeamMember(team.id, this.currentUser.id, userRole);
                
                // Close modal and reload teams
                modal.remove();
                this.loadUserTeams();
                this.render();
                alert('Team created successfully!');
                
            } catch (error) {
                console.error('Error creating team:', error);
                alert('Failed to create team. Please try again.');
            }
        });
    }

    // Create confirmation modal and permanently delete team with all data
    deleteTeam(teamId) {
        const team = this.teams.find(t => t.id === teamId);
        if (!team) {
            alert('Team not found!');
            return;
        }

        // Create confirmation modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Delete Team</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="archive-info">
                    <p><strong>⚠️ Warning:</strong> This action will permanently delete the team "${team.name}" and all associated data including:</p>
                    <ul style="margin: 1rem 0; padding-left: 2rem; color: var(--text-secondary);">
                        <li>All team lineups and formations</li>
                        <li>Team messages and communication history</li>
                        <li>Team events and calendar entries</li>
                        <li>Player statistics and records</li>
                        <li>Team membership records</li>
                    </ul>
                    <p style="color: var(--warning-color); font-weight: 500;">This action cannot be undone!</p>
                </div>
                <form id="delete-team-form">
                    <div class="form-group">
                        <label>Type the team name "${team.name}" to confirm deletion:</label>
                        <input type="text" name="confirmation" placeholder="Enter team name to confirm..." required>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-cancel" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                        <button type="submit" class="btn-delete">Delete Team</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle form submission
        const form = document.getElementById('delete-team-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const confirmation = formData.get('confirmation');
            
            if (confirmation !== team.name) {
                alert('Team name does not match. Please type the exact team name to confirm deletion.');
                return;
            }

            try {
                // Delete team and all associated data
                this.performTeamDeletion(teamId);
                
                // Close modal
                modal.remove();
                
                // Reload teams
                this.loadUserTeams();
                this.render();
                
                alert(`Team "${team.name}" has been successfully deleted.`);
                
            } catch (error) {
                console.error('Error deleting team:', error);
                alert('Failed to delete team. Please try again.');
            }
        });
    }

    // Execute complete team deletion with all associated data
    performTeamDeletion(teamId) {
        // Delete all team-related data in the correct order
        
        // 1. Delete team lineups
        const lineups = window.db.getTeamLineups(teamId);
        lineups.forEach(lineup => {
            window.db.deleteLineup(lineup.id);
        });
        
        // 2. Delete team events
        const events = window.db.getEvents(teamId);
        events.forEach(event => {
            window.db.deleteEvent(event.id);
        });
        
        // 3. Delete team messages/notes
        const notes = window.db.getTable('notes') || [];
        const teamNotes = notes.filter(note => note.team_id === teamId);
        teamNotes.forEach(note => {
            window.db.deleteNote(note.id);
        });
        
        // 4. Delete team invitations
        const invitations = window.db.getTeamInvitations(teamId);
        const allInvitations = window.db.getTable('invitations') || [];
        const filteredInvitations = allInvitations.filter(inv => inv.team_id !== teamId);
        window.db.setTable('invitations', filteredInvitations);
        
        // 5. Remove team memberships
        const memberships = window.db.getTable('team_memberships') || [];
        const filteredMemberships = memberships.filter(membership => membership.team_id !== teamId);
        window.db.setTable('team_memberships', filteredMemberships);
        
        // 6. Delete game stats related to the team
        const gameStats = window.db.getTable('game_stats') || [];
        const filteredGameStats = gameStats.filter(stat => stat.team_id !== teamId);
        window.db.setTable('game_stats', filteredGameStats);
        
        // 7. Finally, delete the team itself
        const teams = window.db.getTable('teams') || [];
        const filteredTeams = teams.filter(team => team.id !== teamId);
        window.db.setTable('teams', filteredTeams);
    }

    // Create modal for editing team details and metadata
    editTeamDetails() {
        if (!this.selectedTeam) {
            alert('No team selected!');
            return;
        }

        // Create modal for editing team details
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit Team Details</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <form id="edit-team-form">
                    <div class="form-group">
                        <label>Team Name</label>
                        <input type="text" name="team_name" value="${this.selectedTeam.name}" required>
                    </div>
                    <div class="form-group">
                        <label>League</label>
                        <input type="text" name="league" value="${this.selectedTeam.league || ''}" placeholder="e.g., Basketball League">
                    </div>
                    <div class="form-group">
                        <label>Season</label>
                        <input type="text" name="season" value="${this.selectedTeam.season || ''}" placeholder="e.g., 2024-25">
                    </div>
                    <div class="form-group">
                        <label>Team Color</label>
                        <input type="color" name="team_color" value="${this.selectedTeam.color || '#6366f1'}">
                    </div>
                    <div class="form-group">
                        <label>Team Logo (Emoji)</label>
                        <input type="text" name="team_logo" value="${this.selectedTeam.logo || '<i class=\'bi bi-trophy-fill\'></i>'}" maxlength="50" placeholder="<i class='bi bi-trophy-fill'></i>">
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-cancel" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                        <button type="submit" class="btn-save">Save Changes</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle form submission
        const form = document.getElementById('edit-team-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            
            try {
                // Update team in database
                const updatedTeam = {
                    name: formData.get('team_name'),
                    league: formData.get('league'),
                    season: formData.get('season'),
                    color: formData.get('team_color'),
                    logo: formData.get('team_logo')
                };

                window.db.updateTeam(this.selectedTeam.id, updatedTeam);
                
                // Update local team object
                Object.assign(this.selectedTeam, updatedTeam);
                
                // Close modal and refresh
                modal.remove();
                this.render();
                alert('Team details updated successfully!');
                
            } catch (error) {
                console.error('Error updating team:', error);
                alert('Failed to update team details. Please try again.');
            }
        });
    }

    // Generate invitation codes for new team members
    inviteUsers() {
        if (!this.selectedTeam) {
            alert('No team selected!');
            return;
        }

        // Create modal for inviting users
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Invite Users to ${this.selectedTeam.name}</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <form id="invite-user-form">
                    <div class="form-group">
                        <label>Role</label>
                        <select name="role" required>
                            <option value="">Select Role</option>
                            <option value="player">Player</option>
                            <option value="coach">Coach</option>
                            <option value="manager">Manager</option>
                            <option value="parent">Parent</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Number of Invitations</label>
                        <input type="number" name="invite_count" value="1" min="1" max="20" required>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-cancel" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                        <button type="submit" class="btn-generate">Generate Invitation Codes</button>
                    </div>
                </form>
                <div id="invitation-results" style="display: none;">
                    <h4>Generated Invitation Codes:</h4>
                    <div id="codes-list"></div>
                    <button type="button" class="btn-copy" onclick="managerApp.copyInvitationCodes()">Copy All Codes</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle form submission
        const form = document.getElementById('invite-user-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            
            try {
                const role = formData.get('role');
                const count = parseInt(formData.get('invite_count'));
                const generatedCodes = [];

                for (let i = 0; i < count; i++) {
                    // Generate registration key using the database method
                    const registrationKey = window.db.generateRegistrationKey(
                        this.selectedTeam.id, 
                        role, 
                        7 // expires in 7 days
                    );
                    
                    generatedCodes.push(registrationKey.key);
                }

                // Display generated codes
                this.displayInvitationCodes(generatedCodes, role);
                
            } catch (error) {
                console.error('Error creating invitations:', error);
                alert('Failed to generate invitation codes. Please try again.');
            }
        });
    }

    // Create interface for archiving team members
    archiveUsers() {
        if (!this.selectedTeam) {
            alert('No team selected!');
            return;
        }

        // Get current team members
        const teamMembers = window.db.getTeamMembers(this.selectedTeam.id);
        const activeMembers = teamMembers.filter(member => !member.archived);

        if (activeMembers.length === 0) {
            alert('No active users to archive.');
            return;
        }

        // Create modal for archiving users
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Archive Users from ${this.selectedTeam.name}</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="archive-info">
                    <p>Select users to archive. Archived users will no longer have access to the team but their data will be preserved.</p>
                </div>
                <form id="archive-users-form">
                    <div class="users-list">
                        ${activeMembers.map(member => `
                            <div class="user-item">
                                <label class="user-checkbox">
                                    <input type="checkbox" name="archive_users" value="${member.id}">
                                    <div class="user-info">
                                        <div class="user-name">${member.first_name} ${member.last_name}</div>
                                        <div class="user-role">${member.role}</div>
                                        <div class="user-email">${member.email}</div>
                                    </div>
                                </label>
                            </div>
                        `).join('')}
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-cancel" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                        <button type="submit" class="btn-archive">Archive Selected Users</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle form submission
        const form = document.getElementById('archive-users-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const selectedUsers = formData.getAll('archive_users');

            if (selectedUsers.length === 0) {
                alert('Please select at least one user to archive.');
                return;
            }

            if (!confirm(`Are you sure you want to archive ${selectedUsers.length} user(s)? This action can be undone later.`)) {
                return;
            }

            try {
                let archivedCount = 0;
                
                selectedUsers.forEach(userId => {
                    // Check if user is not the current user (can't archive yourself)
                    if (userId !== this.currentUser.id) {
                        window.db.archiveTeamMember(this.selectedTeam.id, userId);
                        archivedCount++;
                    }
                });

                modal.remove();
                
                if (archivedCount > 0) {
                    alert(`Successfully archived ${archivedCount} user(s).`);
                    // Reload team data to reflect changes
                    this.loadTeamData();
                    this.render();
                } else {
                    alert('No users were archived. You cannot archive yourself.');
                }
                
            } catch (error) {
                console.error('Error archiving users:', error);
                alert('Failed to archive users. Please try again.');
            }
        });
    }

    // Lineup Management Methods
    // Select lineup for editing and management
    selectLineup(lineupId) {
        this.currentLineup = this.lineups.find(l => l.id === lineupId);
        this.render();
    }

    // Initialize new empty lineup for creation
    createNewLineup() {
        this.currentLineup = this.createEmptyLineup();
        this.render();
    }

    editLineup(lineupId) {
        this.currentLineup = this.lineups.find(l => l.id === lineupId);
        this.goToLineupCreator();
    }

    viewLineup(lineupId) {
        const lineup = this.lineups.find(l => l.id === lineupId);
        if (lineup) {
            let message = `${lineup.name} Lineup:\n\n`;
            ['PG', 'SG', 'SF', 'PF', 'C'].forEach(position => {
                const playerId = lineup.positions[position];
                const player = this.teamPlayers.find(p => p.id === playerId);
                message += `${position}: ${player ? player.name : 'Empty'}\n`;
            });
            alert(message);
        }
    }

    selectPosition(position) {
        const player = prompt(`Select player for ${position} position (enter player name):`);
        if (player) {
            const foundPlayer = this.teamPlayers.find(p => 
                p.name.toLowerCase().includes(player.toLowerCase())
            );
            if (foundPlayer) {
                this.assignPlayerToPosition(foundPlayer.id, position);
            } else {
                alert('Player not found');
            }
        }
    }

    selectPlayerForLineup(playerId) {
        const position = prompt('Select position for this player (PG, SG, SF, PF, C):');
        if (position && ['PG', 'SG', 'SF', 'PF', 'C'].includes(position.toUpperCase())) {
            this.assignPlayerToPosition(playerId, position.toUpperCase());
        }
    }

    assignPlayerToPosition(playerId, position) {
        if (!this.currentLineup) {
            this.currentLineup = this.lineups[0];
        }
        
        this.currentLineup.positions[position] = playerId;
        this.saveTeamLineups();
        this.render();
    }

    saveLineup() {
        this.saveTeamLineups();
        alert('Lineup saved successfully!');
    }

    clearLineup() {
        if (confirm('Clear all positions in this lineup?')) {
            this.currentLineup.positions = {};
            this.saveTeamLineups();
            this.render();
        }
    }

    suggestLineup() {
        const dropdown = document.querySelector('.suggest-dropdown');
        const formation = dropdown.value;
        
        if (!formation || !this.currentLineup) {
            alert('Please select a formation type and ensure a lineup is selected.');
            return;
        }

        // Clear current lineup
        this.currentLineup.positions = {};

        // Apply formation based on player positions and strengths
        const availablePlayers = [...this.teamPlayers];
        
        switch (formation) {
            case 'balanced':
                this.applyBalancedFormation(availablePlayers);
                break;
            case 'offensive':
                this.applyOffensiveFormation(availablePlayers);
                break;
            case 'defensive':
                this.applyDefensiveFormation(availablePlayers);
                break;
        }

        this.saveTeamLineups();
        this.render();
        alert(`${formation.charAt(0).toUpperCase() + formation.slice(1)} formation applied!`);
    }

    applyBalancedFormation(players) {
        // Simple balanced formation - assign players to positions
        const positions = ['PG', 'SG', 'SF', 'PF', 'C'];
        positions.forEach((position, index) => {
            if (players[index]) {
                this.currentLineup.positions[position] = players[index].id;
            }
        });
    }

    applyOffensiveFormation(players) {
        // Prioritize offensive players
        const shuffled = players.sort(() => Math.random() - 0.5);
        const positions = ['PG', 'SG', 'SF', 'PF', 'C'];
        positions.forEach((position, index) => {
            if (shuffled[index]) {
                this.currentLineup.positions[position] = shuffled[index].id;
            }
        });
    }

    applyDefensiveFormation(players) {
        // Prioritize defensive players
        const shuffled = players.sort(() => Math.random() - 0.5);
        const positions = ['C', 'PF', 'SF', 'SG', 'PG']; // Defensive priority
        positions.forEach((position, index) => {
            if (shuffled[index]) {
                this.currentLineup.positions[position] = shuffled[index].id;
            }
        });
    }

    // Notes/Communication Methods
    // Select player for team communication chat
    selectPlayerForChat(playerId) {
        this.selectedPlayer = this.teamPlayers.find(p => p.id === playerId);
        this.render();
    }

    // Send message to selected player through team chat system
    sendMessage() {
        const messageInput = document.getElementById('message-input');
        const message = messageInput.value.trim();
        
        if (!message || !this.selectedPlayer) return;
        
        try {
            // Create message in database
            const messageData = {
                team_id: this.selectedTeam.id,
                recipient_id: this.selectedPlayer.id,
                content: message,
                is_private: true
            };
            
            window.db.createMessage(messageData);
            
            // Clear input
            messageInput.value = '';
            
            // Reload notes and re-render
            this.loadTeamNotes();
            this.render();
            
        } catch (error) {
            this.showError('Failed to send message');
        }
    }

    // Utility Methods
    // Generate unique invitation code for team registration
    generateInviteCode() {
        // Generate a unique 8-character code
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        
        // Add timestamp suffix to ensure uniqueness
        const timestamp = Date.now().toString().slice(-4);
        return code + timestamp.slice(-2);
    }

    // Display generated invitation codes with copy functionality
    displayInvitationCodes(codes, role) {
        const resultsDiv = document.getElementById('invitation-results');
        const codesListDiv = document.getElementById('codes-list');
        
        // Store codes for copying
        this.lastGeneratedCodes = codes;
        
        codesListDiv.innerHTML = `
            <div class="codes-header">
                <p><strong>Registration Keys Generated Successfully!</strong></p>
                <p>Share these 8-character keys with new ${role}s. They can use these keys during registration to join "${this.selectedTeam.name}".</p>
                <p><em>Keys expire in 7 days and can only be used once each.</em></p>
            </div>
            ${codes.map(code => `
                <div class="invitation-code">
                    <div class="code-info">
                        <strong>${code}</strong>
                        <span class="role-badge">${role}</span>
                    </div>
                    <button class="btn-copy-single" onclick="navigator.clipboard.writeText('${code}'); this.innerText='Copied!'; setTimeout(() => this.innerText='Copy', 2000)">Copy</button>
                </div>
            `).join('')}
            <div class="registration-instructions">
                <h4>Instructions for new ${role}s:</h4>
                <ol>
                    <li>Go to the registration page: <strong>${window.location.origin}/register.html</strong></li>
                    <li>Fill in basic information</li>
                    <li>Select "Join Team"</li>
                    <li>Enter the registration key when prompted</li>
                    <li>Complete the remaining registration steps</li>
                </ol>
            </div>
        `;
        
        resultsDiv.style.display = 'block';
        
        // Hide the form
        document.getElementById('invite-user-form').style.display = 'none';
    }

    // Copy all generated invitation codes to clipboard
    copyInvitationCodes() {
        if (this.lastGeneratedCodes && this.lastGeneratedCodes.length > 0) {
            const codesText = this.lastGeneratedCodes.join('\n');
            navigator.clipboard.writeText(codesText).then(() => {
                alert('All invitation codes copied to clipboard!');
            }).catch(() => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = codesText;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                alert('All invitation codes copied to clipboard!');
            });
        }
    }

    // Calculate team statistics for dashboard display
    getTeamStats() {
        // Calculate upcoming games from actual data
        const upcomingGames = this.getUpcomingGamesCount();
        // Calculate games to confirm from actual data
        const gamesToConfirm = this.getGamesToConfirmCount();
        
        return {
            totalPlayers: this.teamPlayers.length,
            totalLineups: this.lineups.length,
            gamesToConfirm: gamesToConfirm,
            upcomingGames: upcomingGames
        };
    }

    // Count upcoming games for team statistics
    getUpcomingGamesCount() {
        try {
            // Get all events for this team (both home and away games)
            const teamEvents = window.db.getTeamEvents(this.selectedTeam.id);
            
            // Filter for upcoming games only
            const now = new Date();
            const upcomingGames = teamEvents.filter(event => {
                // Must be a game event
                if (event.event_type !== 'game') return false;
                
                // Must be confirmed (not pending)
                if (event.is_confirmed === false) return false;
                
                // Must be in the future
                const eventDate = new Date(event.event_date);
                return eventDate > now;
            });
            
            return upcomingGames.length;
        } catch (error) {
            console.error('Error calculating upcoming games:', error);
            return 0;
        }
    }

    // Count games requiring confirmation for dashboard
    getGamesToConfirmCount() {
        try {
            // Get all events where this team is the opponent and needs to confirm
            const allEvents = window.db.getTable('events') || [];
            const currentUser = window.db.getCurrentUser();
            
            if (!currentUser || !this.selectedTeam) {
                return 0;
            }
            
            // Find games where:
            // 1. This team is the opponent_team_id (they were invited to the game)
            // 2. The game is pending confirmation (pending_confirmation = true)
            // 3. The game is not yet confirmed (is_confirmed = false)
            const gamesToConfirm = allEvents.filter(event => {
                return event.event_type === 'game' &&
                       event.opponent_team_id === this.selectedTeam.id &&
                       event.pending_confirmation === true &&
                       event.is_confirmed === false;
            });
            
            console.log('=== GAMES TO CONFIRM DEBUG ===');
            console.log('Current team ID:', this.selectedTeam.id);
            console.log('All events:', allEvents);
            console.log('Games where this team is opponent:', allEvents.filter(e => e.opponent_team_id === this.selectedTeam.id));
            console.log('Games to confirm:', gamesToConfirm);
            console.log('Count:', gamesToConfirm.length);
            
            return gamesToConfirm.length;
        } catch (error) {
            console.error('Error calculating games to confirm:', error);
            return 0;
        }
    }

    // Get lineup information for dashboard display
    getLineupInfo(lineupName) {
        const lineup = this.lineups.find(l => l.name.toLowerCase().includes(lineupName.toLowerCase()));
        if (!lineup || !lineup.positions) {
            return 'No players assigned';
        }
        
        const assignedPositions = Object.keys(lineup.positions).length;
        return `${assignedPositions}/5 positions filled`;
    }

    // Display error message to user
    showError(message) {
        alert(message);
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}

// Initialize the manager app
document.addEventListener('DOMContentLoaded', () => {
    window.managerApp = new ManagerApp();
});
