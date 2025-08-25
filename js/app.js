/**
 * File Name: app.js
 * Purpose: Core application controller that manages the main dashboard and overall application state. 
 *          Handles initial app setup, player statistics display, and coordinates between different modules.
 * Author: Brooklyn Ridley
 * Date Created: 27th July 2025
 * Last Modified: 25th August 2025
    */
class TeamForgeApp {
    // Initialize application with default state and player statistics data
    constructor() {
        this.currentPage = 'dashboard';
        this.currentPlayerIndex = 0;
        this.playerStats = [
            {
                name: 'Brooklyn Ridley',
                number: 23,
                position: 'PG',
                height: '163cm',
                weight: '73kg',
                age: 17,
                wingspan: '166cm',
                vertical: '83cm',
                stats: { ppg: 14.3, apg: 6.2, rpg: 3.6, spg: 2.4, mpg: 32.4 }
            },
            {
                name: 'Kevin Vu',
                number: 15,
                position: 'SF',
                height: '186cm',
                weight: '104kg',
                age: 18,
                wingspan: '202cm',
                vertical: '40cm',
                stats: { ppg: 12.4, apg: 2.8, rpg: 5.9, spg: 1.2, mpg: 24.3 }
            },
            {
                name: 'Surya Lagnathan',
                number: 8,
                position: 'SG',
                height: '178cm',
                weight: '81kg',
                age: 17,
                wingspan: '185cm',
                vertical: '53cm',
                stats: { ppg: 18.7, apg: 3.1, rpg: 4.2, spg: 1.8, mpg: 28.6 }
            },
            {
                name: 'Jamie Oakley',
                number: 7,
                position: 'C',
                height: '185cm',
                weight: '95kg',
                age: 18,
                wingspan: '186cm',
                vertical: '72cm',
                stats: { ppg: 11.2, apg: 1.1, rpg: 9.4, spg: 0.8, mpg: 26.7 }
            },
            {
                name: 'Rhys Ingram',
                number: 32,
                position: 'PF',
                height: '205cm',
                weight: '103kg',
                age: 17,
                wingspan: '212cm',
                vertical: '23cm',
                stats: { ppg: 16.8, apg: 1.4, rpg: 8.7, spg: 0.9, mpg: 30.1 }
            },
            {
                name: 'Oscar Huang',
                number: 11,
                position: 'C',
                height: '175cm',
                weight: '74kg',
                age: 17,
                wingspan: '177cm',
                vertical: '108cm',
                stats: { ppg: 8.3, apg: 1.8, rpg: 4.2, spg: 1.1, mpg: 18.5 }
            }
        ];
        // Only auto-initialize on index page
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
            this.init();
        }
    }

    // Initialize the application by setting up navigation and loading default page
    init() {
        // Only setup navigation if we're on the index page
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
            this.setupNavigation();
            this.loadPage(this.currentPage);
        }
    }

    // Set up navigation event listeners for sidebar menu items
    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-icon');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                // Only handle hash links for SPA navigation on index page
                const href = link.getAttribute('href');
                if (href.startsWith('#')) {
                    e.preventDefault();
                    const page = href.substring(1);
                    this.loadPage(page);
                }
                // All .html links will navigate normally
            });
        });
    }

    /**
     * PURPOSE: Dynamically loads different page content based on user navigation with role-based access control
     * INPUTS: page (string representing the page to load: 'dashboard', 'roster', 'stats', 'manager')
     * OUTPUTS: Renders appropriate page content in the main container and updates navigation state
     * JUSTIFICATION: Central page routing system that enables seamless single-page application navigation while maintaining clean separation of concerns
     * FUTURE ENHANCEMENTS: Add browser history management, implement lazy loading for large content, add transition animations between pages
     */
    loadPage(page) {
        this.currentPage = page;
        this.updateActiveNav();
        
        // Update page content based on current page
        const mainContent = document.querySelector('.main-content .container');
        
        switch(page) {
            case 'dashboard':
                this.loadDashboard(mainContent);
                break;
            case 'roster':
                this.loadRoster(mainContent);
                break;
            case 'stats':
                this.loadStats(mainContent);
                break;
            case 'manager':
                this.loadManager(mainContent);
                break;
            default:
                this.loadDashboard(mainContent);
        }
    }

    // Update navigation bar to highlight the currently active page
    updateActiveNav() {
        const navLinks = document.querySelectorAll('.nav-icon');
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href.startsWith('#')) {
                const page = href.substring(1);
                if (page === this.currentPage) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            }
        });
    }

    // Get the currently selected player from the statistics carousel
    getCurrentPlayer() {
        return this.playerStats[this.currentPlayerIndex];
    }

    // Navigate to the next player in the statistics carousel with circular navigation
    nextPlayer() {
        const currentUser = window.db?.getCurrentUser();
        if (!currentUser) return;
        
        const userTeams = window.db.getUserTeams(currentUser.id);
        if (!userTeams.length) return;
        
        const statsTeam = userTeams.find(team => parseInt(team.id) === parseInt(this.selectedStatsTeamId)) || userTeams[0];
        const teamPlayers = window.db.getTeamPlayers(statsTeam.id);
        if (!teamPlayers.length) return;
        
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % teamPlayers.length;
        this.updateStatsSection(teamPlayers);
    }

    // Navigate to the previous player in the statistics carousel with circular navigation
    previousPlayer() {
        const currentUser = window.db?.getCurrentUser();
        if (!currentUser) return;
        
        const userTeams = window.db.getUserTeams(currentUser.id);
        if (!userTeams.length) return;
        
        const statsTeam = userTeams.find(team => parseInt(team.id) === parseInt(this.selectedStatsTeamId)) || userTeams[0];
        const teamPlayers = window.db.getTeamPlayers(statsTeam.id);
        if (!teamPlayers.length) return;
        
        this.currentPlayerIndex = (this.currentPlayerIndex - 1 + teamPlayers.length) % teamPlayers.length;
        this.updateStatsSection(teamPlayers);
    }

    // Update the statistics display section with new team player data
    updateStatsSection(teamPlayers) {
        const statsContent = document.querySelector('.stats-content');
        if (!statsContent || !teamPlayers.length) return;

        const currentPlayer = this.getCurrentPlayerFromStatsDB(teamPlayers);
        
        statsContent.innerHTML = `
            <div class="stats-header">
                <div class="player-info">
                    <div class="player-name">${currentPlayer.name}</div>
                    <div class="player-details">#${currentPlayer.jersey_number || 'N/A'} • ${currentPlayer.position || 'N/A'}</div>
                </div>
                <div class="carousel-nav">
                    <button class="carousel-btn prev-btn" onclick="app.previousPlayer()">&lt;</button>
                    <div class="carousel-indicator">${this.currentPlayerIndex + 1} / ${teamPlayers.length}</div>
                    <button class="carousel-btn next-btn" onclick="app.nextPlayer()">&gt;</button>
                </div>
            </div>
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">PPG</span>
                    <span class="stat-value">${currentPlayer.stats.ppg || '0.0'}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">APG</span>
                    <span class="stat-value">${currentPlayer.stats.apg || '0.0'}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">RPG</span>
                    <span class="stat-value">${currentPlayer.stats.rpg || '0.0'}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">SPG</span>
                    <span class="stat-value">${currentPlayer.stats.spg || '0.0'}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">MPG</span>
                    <span class="stat-value">${currentPlayer.stats.mpg || '0.0'}</span>
                </div>
            </div>
        `;
    }

    /**
     * PURPOSE: Generates and displays the comprehensive dashboard interface with real-time team data, statistics, roster, and events
     * INPUTS: container (DOM element where dashboard content will be rendered)
     * OUTPUTS: Renders complete dashboard with interactive statistics carousel, team roster, recent messages, and upcoming events
     * JUSTIFICATION: Primary interface function that aggregates and displays critical team information in a user-friendly dashboard layout with role-based content filtering
     * FUTURE ENHANCEMENTS: Add real-time data synchronization, implement customizable dashboard widgets, add data export functionality
     */
    loadDashboard(container) {
        // Check if user is logged in and get their data
        const currentUser = window.db?.getCurrentUser();
        if (!currentUser) {
            container.innerHTML = `
                <div class="welcome-screen">
                    <h2>Welcome to TeamForge</h2>
                    <p>Please <a href="login.html">login</a> or <a href="register.html">register</a> to access your dashboard.</p>
                </div>
            `;
            return;
        }

        // Get user's teams and data
        const userTeams = window.db.getUserTeams(currentUser.id);
        console.log('Dashboard: User teams found:', userTeams);
        console.log('Dashboard: Current user:', currentUser);
        console.log('Dashboard: All teams in DB:', window.db.getTable('teams'));
        console.log('Dashboard: All notes in DB:', window.db.getTable('notes'));
        console.log('Dashboard: All users in DB:', window.db.getTable('users'));
        
        const selectedTeam = userTeams[0]; // Use first team for now
        console.log('Dashboard: Selected team:', selectedTeam);
        
        // Store teams for roster dropdown
        this.userTeams = userTeams;
        this.selectedRosterTeamId = this.selectedRosterTeamId || selectedTeam?.id;
        this.selectedStatsTeamId = this.selectedStatsTeamId || selectedTeam?.id;
        
        // Get team players and their stats
        let teamPlayers = [];
        let recentNotes = [];
        let upcomingEvents = [];
        
        // Get roster team players (may be different from selected team)
        const rosterTeam = userTeams.find(team => parseInt(team.id) === parseInt(this.selectedRosterTeamId)) || selectedTeam;
        let rosterPlayers = [];
        
        // Get stats team players (may be different from selected team and roster team)
        const statsTeam = userTeams.find(team => parseInt(team.id) === parseInt(this.selectedStatsTeamId)) || selectedTeam;
        let statsPlayers = [];
        
        if (selectedTeam) {
            teamPlayers = window.db.getTeamPlayers(selectedTeam.id);
            recentNotes = this.getRecentTeamNotes(selectedTeam.id);
            console.log('Dashboard: Recent notes for team', selectedTeam.id, ':', recentNotes);
            
            upcomingEvents = this.getUpcomingTeamEvents(selectedTeam.id);
        }
        
        if (rosterTeam) {
            rosterPlayers = window.db.getTeamPlayers(rosterTeam.id);
        }
        
        if (statsTeam) {
            statsPlayers = window.db.getTeamPlayers(statsTeam.id);
        }

        container.innerHTML = `
            <div class="dashboard-grid">
                <!-- Recent Messages Section -->
                <div class="dashboard-card">
                    <div class="card-header">
                        <h3 class="card-title">Recent Messages</h3>
                        <a href="notes.html" class="view-all-btn">View All</a>
                    </div>
                    <div class="card-content">
                        ${recentNotes.length > 0 ? `
                            <div class="messages-preview">
                                ${recentNotes.map(note => {
                                    // Use the author_name that was already resolved in getRecentTeamNotes
                                    const authorName = note.author_name || 'Unknown';
                                    const initials = this.getInitials(authorName);
                                    
                                    // Use the timestamp that was resolved in getRecentTeamNotes
                                    const timeStr = this.formatTime(note.created_at || note.timestamp);
                                    
                                    // Truncate long messages
                                    const maxLength = 80;
                                    const messageContent = note.content || note.message || '';
                                    const truncatedContent = messageContent.length > maxLength ? 
                                        messageContent.substring(0, maxLength) + '...' : 
                                        messageContent;
                                    
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
                                }).join('')}
                            </div>
                        ` : `
                            <div class="no-messages">
                                <p>No recent messages to display.</p>
                                <p>Connect with your team through the Messages page.</p>
                            </div>
                        `}
                    </div>
                </div>

                <!-- Statistics Section -->
                <div class="dashboard-card">
                    <div class="dashboard-card-header">
                        <h3 class="dashboard-card-title">Statistics</h3>
                        <div class="dashboard-card-number">${statsPlayers.length}</div>
                    </div>
                    <div class="stats-controls">
                        <select class="stats-team-select" onchange="app.changeStatsTeam(this.value)">
                            ${userTeams.map(team => `
                                <option value="${team.id}" ${parseInt(team.id) === parseInt(this.selectedStatsTeamId) ? 'selected' : ''}>
                                    ${team.name}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="stats-content">
                        ${statsPlayers.length > 0 ? `
                            <div class="stats-header">
                                <div class="player-info">
                                    <div class="player-name">${this.getCurrentPlayerFromStatsDB(statsPlayers).name}</div>
                                    <div class="player-details">#${this.getCurrentPlayerFromStatsDB(statsPlayers).jersey_number || 'N/A'} • ${this.getCurrentPlayerFromStatsDB(statsPlayers).position || 'N/A'}</div>
                                </div>
                                <div class="carousel-nav">
                                    <button class="carousel-btn prev-btn" onclick="app.previousPlayer()">&lt;</button>
                                    <div class="carousel-indicator">${this.currentPlayerIndex + 1} / ${statsPlayers.length}</div>
                                    <button class="carousel-btn next-btn" onclick="app.nextPlayer()">&gt;</button>
                                </div>
                            </div>
                            <div class="stats-grid">
                                <div class="stat-item">
                                    <span class="stat-label">PPG</span>
                                    <span class="stat-value">${this.getCurrentPlayerFromStatsDB(statsPlayers).stats.ppg || '0.0'}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">APG</span>
                                    <span class="stat-value">${this.getCurrentPlayerFromStatsDB(statsPlayers).stats.apg || '0.0'}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">RPG</span>
                                    <span class="stat-value">${this.getCurrentPlayerFromStatsDB(statsPlayers).stats.rpg || '0.0'}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">SPG</span>
                                    <span class="stat-value">${this.getCurrentPlayerFromStatsDB(statsPlayers).stats.spg || '0.0'}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">MPG</span>
                                    <span class="stat-value">${this.getCurrentPlayerFromStatsDB(statsPlayers).stats.mpg || '0.0'}</span>
                                </div>
                            </div>
                        ` : `
                            <div class="no-data-message">
                                <p>No player statistics available</p>
                                <p>Add players to your team to see stats</p>
                            </div>
                        `}
                    </div>
                </div>

                <!-- Roster Section -->
                <div class="dashboard-card">
                    <div class="dashboard-card-header">
                        <h3 class="dashboard-card-title">Roster</h3>
                        <div class="dashboard-card-number">${rosterPlayers.length}</div>
                    </div>
                    <div class="roster-controls">
                        <select class="roster-team-select" onchange="app.changeRosterTeam(this.value)">
                            ${userTeams.map(team => `
                                <option value="${team.id}" ${parseInt(team.id) === parseInt(this.selectedRosterTeamId) ? 'selected' : ''}>
                                    ${team.name}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="roster-list scrollable">
                        ${rosterPlayers.length > 0 ? rosterPlayers.map(player => `
                            <div class="roster-item">
                                <div class="roster-player">
                                    <div class="roster-avatar">${this.getInitials(this.getPlayerFullName(player))}</div>
                                    <span class="roster-name">${this.getPlayerFullName(player)}</span>
                                </div>
                                <div class="roster-position">${this.getPlayerPosition(player)}</div>
                            </div>
                        `).join('') : `
                            <div class="roster-item">
                                <div class="roster-player">
                                    <span class="roster-name">No players in roster</span>
                                </div>
                            </div>
                        `}
                    </div>
                </div>

                <!-- Upcoming Events Section -->
                <div class="dashboard-card">
                    <div class="dashboard-card-header">
                        <h3 class="dashboard-card-title">Upcoming Events</h3>
                        <div class="dashboard-card-number">${upcomingEvents.length}</div>
                    </div>
                    <div class="events-list">
                        ${upcomingEvents.length > 0 ? upcomingEvents.slice(0, 3).map(event => `
                            <div class="event-item">
                                <div class="event-priority ${event.priority || 'optional'}"></div>
                                <div class="event-content">
                                    <div class="event-title">${event.title}</div>
                                </div>
                                <div class="event-date">${this.formatEventDate(event.event_date)}</div>
                            </div>
                        `).join('') : `
                            <div class="event-item">
                                <div class="event-content">
                                    <div class="event-title">No upcoming events</div>
                                </div>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
        
        // Store the real data for carousel functionality
        this.realPlayerStats = statsPlayers.map(player => this.convertToPlayerStats(player));
        
        // Only initialize currentPlayerIndex if it's not already set or if it's out of bounds
        if (typeof this.currentPlayerIndex === 'undefined' || this.currentPlayerIndex >= statsPlayers.length) {
            this.currentPlayerIndex = 0;
        }
    }

    /**
     * PURPOSE: Renders the team roster page with detailed player cards displaying biometric and performance data
     * INPUTS: container (DOM element where roster content will be rendered)
     * OUTPUTS: Displays interactive grid of player cards with comprehensive player information and modal functionality
     * JUSTIFICATION: Essential team management interface that provides coaches and managers with quick access to player profiles and statistics
     * FUTURE ENHANCEMENTS: Add player comparison tools, implement roster optimization suggestions, add player performance analytics
     */
    loadRoster(container) {
        container.innerHTML = `
            <div class="roster-page">
                <div class="roster-header">
                    <h2 class="page-title">Team Roster</h2>
                    <div class="roster-info">
                        <span class="roster-count">Roster - ${this.playerStats.length} players</span>
                        <button class="scroll-btn">▲ Scroll to get cut ▲</button>
                    </div>
                </div>
                
                <div class="roster-grid">
                    ${this.playerStats.map(player => this.generatePlayerCard(player)).join('')}
                </div>
            </div>
        `;
    }

    // Generate initials from a full name for avatar display
    getInitials(name) {
        if (!name || typeof name !== 'string') return 'N/A';
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }

    // Format timestamp into human-readable relative time (e.g., "2 hours ago")
    formatTime(timestamp) {
        try {
            if (!timestamp) return 'Recently';
            
            const date = new Date(timestamp);
            
            // Check if date is valid
            if (isNaN(date.getTime())) return 'Recently';
            
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

    // Extract and format player's full name from database object
    getPlayerFullName(player) {
        if (!player) return 'Unknown Player';
        const firstName = player.firstName || player.first_name || '';
        const lastName = player.lastName || player.last_name || '';
        return `${firstName} ${lastName}`.trim() || 'Unknown Player';
    }

    // Get player's position or preferred position from database object
    getPlayerPosition(player) {
        return player.position || player.preferred_position || 'N/A';
    }

    // Retrieve recent team messages/notes for dashboard display
    getRecentTeamNotes(teamId) {
        try {
            const currentUser = window.db?.getCurrentUser();
            if (!currentUser) return [];

            const notes = window.db.getTable('notes') || [];
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
                .map(note => {
                    const senderName = this.getSenderName(note.author_id || note.fromUserId);
                    console.log('Processing note for display:', {
                        id: note.id,
                        senderName,
                        author_id: note.author_id,
                        fromUserId: note.fromUserId,
                        created_at: note.created_at,
                        timestamp: note.timestamp,
                        content: note.content
                    });
                    return {
                        ...note,
                        author_name: senderName,
                        content: note.content || note.message
                    };
                });
                
            console.log('Final recent messages:', recentMessages);
            return recentMessages;
        } catch (error) {
            console.error('Error getting recent team notes:', error);
            return [];
        }
    }

    // Look up and return sender's full name from user database
    getSenderName(senderId) {
        try {
            if (!senderId) {
                console.log('No senderId provided');
                return 'Unknown';
            }
            
            const users = window.db.getTable('users') || [];
            console.log('Looking for user with ID:', senderId, 'in users:', users.map(u => ({ id: u.id, name: `${u.first_name || u.firstName || ''} ${u.last_name || u.lastName || ''}`.trim() })));
            
            const user = users.find(u => u.id === senderId);
            if (!user) {
                console.log('User not found for ID:', senderId);
                return 'Unknown';
            }
            
            // Return full name (first name + last name) instead of username/email
            const firstName = user.first_name || user.firstName || '';
            const lastName = user.last_name || user.lastName || '';
            const fullName = `${firstName} ${lastName}`.trim();
            
            console.log('Found user:', { id: senderId, firstName, lastName, fullName, username: user.username });
            
            // Fallback to username if no name is available
            return fullName || user.username || 'Unknown';
        } catch (error) {
            console.error('Error fetching sender name:', error);
            return 'Unknown';
        }
    }

    // Get upcoming events for a team, sorted by date with priority indicators
    getUpcomingTeamEvents(teamId) {
        if (!window.db || !teamId) return [];
        
        try {
            const allEvents = window.db.getTable('events') || [];
            const now = new Date();
            
            return allEvents
                .filter(event => {
                    // Include events where team is home team or opponent
                    return (event.team_id === teamId || event.opponent_team_id === teamId) && 
                           new Date(event.event_date) > now;
                })
                .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
                .slice(0, 3)
                .map(event => ({
                    ...event,
                    priority: event.event_type === 'game' ? 'important' : 'optional'
                }));
        } catch (error) {
            console.error('Error getting upcoming team events:', error);
            return [];
        }
    }

    // Format event date string for display in Australian format (DD/MM/YY)
    formatEventDate(dateString) {
        if (!dateString) return 'TBD';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-AU', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit'
            });
        } catch (error) {
            return 'TBD';
        }
    }

    // Get current player data from database with fallback to default stats
    getCurrentPlayerFromDB() {
        const currentUser = window.db?.getCurrentUser();
        if (!currentUser) return this.getDefaultPlayerStats();
        
        const userTeams = window.db.getUserTeams(currentUser.id);
        if (!userTeams.length) return this.getDefaultPlayerStats();
        
        const teamPlayers = window.db.getTeamPlayers(userTeams[0].id);
        if (!teamPlayers.length) return this.getDefaultPlayerStats();
        
        const player = teamPlayers[this.currentPlayerIndex] || teamPlayers[0];
        return this.convertToPlayerStats(player);
    }

    // Get current player from provided statistics array with index bounds checking
    getCurrentPlayerFromStatsDB(statsPlayers) {
        if (!statsPlayers || !statsPlayers.length) return this.getDefaultPlayerStats();
        
        const player = statsPlayers[this.currentPlayerIndex] || statsPlayers[0];
        return this.convertToPlayerStats(player);
    }

    // Convert player database object to standardized stats format with calculated averages
    convertToPlayerStats(player) {
        if (!player) return this.getDefaultPlayerStats();
        
        const averages = window.db.calculatePlayerAverages(player.id) || {};
        
        return {
            name: this.getPlayerFullName(player),
            jersey_number: player.jersey_number || 'N/A',
            position: this.getPlayerPosition(player),
            stats: {
                ppg: averages.points_avg?.toFixed(1) || '0.0',
                apg: averages.assists_avg?.toFixed(1) || '0.0',
                rpg: averages.rebounds_avg?.toFixed(1) || '0.0',
                spg: averages.steals_avg?.toFixed(1) || '0.0',
                mpg: averages.minutes_avg?.toFixed(1) || '0.0'
            }
        };
    }

    // Return default empty player statistics object for fallback scenarios
    getDefaultPlayerStats() {
        return {
            name: 'No Player Data',
            jersey_number: 'N/A',
            position: 'N/A',
            stats: {
                ppg: '0.0',
                apg: '0.0',
                rpg: '0.0',
                spg: '0.0',
                mpg: '0.0'
            }
        };
    }

    // Change selected roster team and refresh dashboard display
    changeRosterTeam(teamId) {
        this.selectedRosterTeamId = parseInt(teamId);
        
        // Get the current container and reload the dashboard to update roster
        const container = document.querySelector('#dashboard-content') || document.querySelector('.main-content .container');
        if (container) {
            this.loadDashboard(container);
        }
    }

    // Change selected statistics team, reset player index, and refresh dashboard
    changeStatsTeam(teamId) {
        this.selectedStatsTeamId = parseInt(teamId);
        this.currentPlayerIndex = 0; // Reset to first player when changing teams
        
        // Get the current container and reload the dashboard to update stats
        const container = document.querySelector('#dashboard-content') || document.querySelector('.main-content .container');
        if (container) {
            this.loadDashboard(container);
        }
    }

    // Generate HTML for individual player card with stats and clickable modal functionality
    generatePlayerCard(player) {
        // Get initials for avatar
        const initials = player.name.split(' ').map(n => n[0]).join('');
        
        return `
            <div class="player-card" onclick="app.showPlayerModal('${player.name.replace(/'/g, "\\'")}')">
                <div class="player-card-header">
                    <div class="player-avatar">
                        <div class="avatar-circle">${initials}</div>
                    </div>
                    <h3 class="player-name">${player.name}</h3>
                </div>
                <div class="player-stats">
                    <div class="stat-row">
                        <span class="stat-label">Height:</span>
                        <span class="stat-value">${player.height}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Weight:</span>
                        <span class="stat-value">${player.weight}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Age:</span>
                        <span class="stat-value">${player.age}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Wingspan:</span>
                        <span class="stat-value">${player.wingspan}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Vertical:</span>
                        <span class="stat-value">${player.vertical}</span>
                    </div>
                </div>
            </div>
        `;
    }

    // Load basic statistics page with hardcoded team performance data
    loadStats(container) {
        container.innerHTML = `
            <h2>Team Statistics</h2>
            <div class="grid grid-2">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Top Performers</h3>
                    </div>
                    <p>1. Brooklyn Ridley - 14.3 PPG</p>
                    <p>2. Surya Lagnathan - 12.1 PPG</p>
                    <p>3. Rhys Ingram - 11.2 PPG</p>
                </div>
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Team Averages</h3>
                    </div>
                    <p>Points per Game: 85.2</p>
                    <p>Field Goal %: 47.8%</p>
                    <p>Free Throw %: 78.5%</p>
                </div>
            </div>
        `;
    }

    /**
     * PURPOSE: Initializes and loads the comprehensive manager interface with team selection, dashboard, and administrative tools
     * INPUTS: container (DOM element where manager content will be rendered)
     * OUTPUTS: Renders complete manager interface with team selection, lineup management, and communication tools
     * JUSTIFICATION: Central management hub that provides coaches with comprehensive team administration capabilities including lineups, notes, and team management
     * FUTURE ENHANCEMENTS: Add real-time collaboration features, implement advanced analytics dashboard, add team performance tracking
     */
    loadManager(container) {
        console.log('Loading manager page...', container);
        
        // Simple fallback test first
        if (!container) {
            console.error('No container provided to loadManager');
            return;
        }
        
        // Test with simple content first
        try {
            container.innerHTML = '<h2>Manager Page Loading...</h2>';
            console.log('Basic content set');
            
            // Initialize manager state if not exists
            if (!this.managerState) {
                console.log('Initializing manager state');
                this.managerState = {
                    selectedTeam: null,
                    currentView: 'team-selection',
                    teams: [
                        {
                            id: 1,
                            name: 'New Zealand Breakers',
                            logo: '🏀',
                            color: '#2563eb'
                        },
                        {
                            id: 2,
                            name: 'Perth Wildcats',
                            logo: '🏀',
                            color: '#dc2626'
                        },
                        {
                            id: 3,
                            name: 'Melbourne United',
                            logo: '🏀',
                            color: '#059669'
                        }
                    ],
                    notes: [
                        {
                            id: 1,
                            author: 'Brooklyn Ridley',
                            message: 'Hey Coach, Just Wondering what the gameplan...',
                            timestamp: new Date().toISOString()
                        },
                        {
                            id: 2,
                            author: 'Kevin Yu',
                            message: 'Sup Coach, I am away next week due to a family...',
                            timestamp: new Date().toISOString()
                        }
                    ],
                    lineups: {
                        starters: ['Brooklyn Ridley', 'Surya Lagnathan', 'Kevin Yu'],
                        bench: ['Rhys Ingram', 'Jamie Oakley', 'Oscar Huang', 'Philip Wickham', 'Damon Bendemedjer', 'William Smith', 'Jack Gibous'],
                        custom: []
                    }
                };
            }
            
            console.log('Manager state initialized, rendering view');
            this.renderManagerView(container);
            
        } catch (error) {
            console.error('Error in loadManager:', error);
            container.innerHTML = `
                <div style="padding: 2rem; text-align: center;">
                    <h2>Manager Page</h2>
                    <p style="color: red;">Error loading manager: ${error.message}</p>
                    <button onclick="location.reload()" style="padding: 0.5rem 1rem; margin-top: 1rem;">Reload Page</button>
                </div>
            `;
        }
    }

    /**
     * PURPOSE: Renders different manager interface views based on current state with comprehensive error handling
     * INPUTS: container (DOM element for rendering manager content)
     * OUTPUTS: Displays appropriate manager view (team selection, dashboard, notes, lineup creator) based on current state
     * JUSTIFICATION: Core navigation system for manager interface that handles view switching and state management with robust error recovery
     * FUTURE ENHANCEMENTS: Add view transition animations, implement breadcrumb navigation, add view state persistence
     */
    renderManagerView(container) {
        console.log('renderManagerView called', this.managerState);
        
        try {
            const { currentView, selectedTeam } = this.managerState;
            console.log('Current view:', currentView, 'Selected team:', selectedTeam);
            
            switch (currentView) {
                case 'team-selection':
                    console.log('Rendering team selection');
                    this.renderTeamSelection(container);
                    break;
                case 'dashboard':
                    console.log('Rendering dashboard');
                    this.renderManagerDashboard(container);
                    break;
                case 'notes':
                    console.log('Rendering notes');
                    this.renderNotesPage(container);
                    break;
                case 'lineup-creator':
                    console.log('Rendering lineup creator');
                    this.renderLineupCreator(container);
                    break;
                default:
                    console.log('Default case - rendering team selection');
                    this.renderTeamSelection(container);
            }
        } catch (error) {
            console.error('Error in renderManagerView:', error);
            container.innerHTML = `
                <div style="padding: 2rem; text-align: center;">
                    <h2>Manager Page</h2>
                    <p style="color: red;">Error rendering view: ${error.message}</p>
                    <button onclick="location.reload()" style="padding: 0.5rem 1rem; margin-top: 1rem;">Reload Page</button>
                </div>
            `;
        }
    }

    // Render team selection interface with interactive team cards and new team creation option
    renderTeamSelection(container) {
        container.innerHTML = `
            <div class="manager-header">
                <h2>Select Team</h2>
                <button class="btn btn-outline" onclick="app.createNewTeam()">
                    <span>➕</span> New Team
                </button>
            </div>
            
            <div class="team-selection-grid">
                ${this.managerState.teams.map(team => `
                    <div class="team-card">
                        <div class="team-logo" style="color: ${team.color}">
                            ${team.logo}
                        </div>
                        <h3 class="team-name">${team.name}</h3>
                        <button class="btn btn-primary select-team-btn" 
                                onclick="app.selectTeam(${team.id})"
                                ${team.id === 2 ? 'style="background-color: #0ea5e9;"' : ''}>
                            Select Team
                        </button>
                    </div>
                `).join('')}
            </div>
            
            <style>
                .manager-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                }
                
                .team-selection-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 1.5rem;
                    max-width: 900px;
                }
                
                .team-card {
                    background: white;
                    border: 2px solid #e5e7eb;
                    border-radius: 12px;
                    padding: 2rem;
                    text-align: center;
                    transition: all 0.3s ease;
                }
                
                .team-card:hover {
                    border-color: #3b82f6;
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(59, 130, 246, 0.15);
                }
                
                .team-logo {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                }
                
                .team-name {
                    margin: 1rem 0;
                    color: #1f2937;
                    font-weight: 600;
                }
                
                .select-team-btn {
                    width: 100%;
                    margin-top: 1rem;
                }
            </style>
        `;
    }

    // Render main manager dashboard with lineup management, team editing, and notes preview
    renderManagerDashboard(container) {
        const selectedTeam = this.managerState.teams.find(t => t.id === this.managerState.selectedTeam);
        
        container.innerHTML = `
            <div class="manager-dashboard">
                <div class="dashboard-header">
                    <button class="btn btn-secondary back-btn" onclick="app.goBackToTeamSelection()">
                        ← Back to Teams
                    </button>
                    <h2>Manager Dashboard - ${selectedTeam.name}</h2>
                </div>
                
                <div class="dashboard-grid">
                    <div class="dashboard-card">
                        <h3>Lineups</h3>
                        <div class="lineup-actions">
                            <div class="lineup-item">
                                <span>Starters Lineup</span>
                                <button class="btn btn-outline" onclick="app.viewLineup('starters')">View</button>
                            </div>
                            <div class="lineup-item">
                                <span>Bench Lineup</span>
                                <button class="btn btn-outline" onclick="app.viewLineup('bench')">View</button>
                            </div>
                            <div class="lineup-item">
                                <span>Create New Lineup</span>
                                <button class="btn btn-primary" onclick="app.goToLineupCreator()">Create</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="dashboard-card">
                        <h3>Edit Team</h3>
                        <div class="team-actions">
                            <button class="btn btn-outline" onclick="app.editTeamDetails()">Edit Team Details</button>
                            <button class="btn btn-outline" onclick="app.inviteUsers()">Invite Users</button>
                            <button class="btn btn-outline" onclick="app.archiveUsers()">Archive Users</button>
                        </div>
                    </div>
                    
                    <div class="dashboard-card notes-preview">
                        <h3>Notes</h3>
                        <div class="notes-list">
                            ${this.managerState.notes.slice(0, 2).map(note => `
                                <div class="note-item">
                                    <div class="note-author"><i class="bi bi-chat-dots-fill"></i> ${note.author}</div>
                                    <div class="note-message">${note.message}</div>
                                </div>
                            `).join('')}
                        </div>
                        <button class="btn btn-primary" onclick="app.goToNotes()">Go to Notes</button>
                    </div>
                </div>
            </div>
            
            <style>
                .manager-dashboard {
                    max-width: 1200px;
                }
                
                .dashboard-header {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    margin-bottom: 2rem;
                }
                
                .back-btn {
                    background: #f3f4f6;
                    border: 1px solid #d1d5db;
                }
                
                .dashboard-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 2rem;
                }
                
                .dashboard-card {
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 12px;
                    padding: 1.5rem;
                }
                
                .dashboard-card h3 {
                    margin-bottom: 1.5rem;
                    color: #1f2937;
                    font-weight: 600;
                }
                
                .lineup-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                
                .lineup-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.75rem;
                    background: #f9fafb;
                    border-radius: 6px;
                }
                
                .team-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                
                .notes-preview {
                    grid-column: 1 / -1;
                }
                
                .notes-list {
                    margin-bottom: 1rem;
                }
                
                .note-item {
                    background: #f9fafb;
                    padding: 1rem;
                    border-radius: 6px;
                    margin-bottom: 0.5rem;
                }
                
                .note-author {
                    font-weight: 600;
                    color: #374151;
                    margin-bottom: 0.5rem;
                }
                
                .note-message {
                    color: #6b7280;
                }
                
                @media (max-width: 768px) {
                    .dashboard-grid {
                        grid-template-columns: 1fr;
                    }
                }
            </style>
        `;
    }

    // Render team communication interface with player sidebar and messaging functionality
    renderNotesPage(container) {
        container.innerHTML = `
            <div class="notes-page">
                <div class="notes-header">
                    <button class="btn btn-secondary back-btn" onclick="app.goBackToDashboard()">
                        ← Back to Dashboard
                    </button>
                    <h2>Team Communication</h2>
                </div>
                
                <div class="notes-layout">
                    <div class="players-sidebar">
                        <h3>Team Members</h3>
                        <div class="players-list">
                            ${this.playerStats.map(player => `
                                <div class="player-item" onclick="app.selectPlayerForChat('${player.name}')">
                                    ${player.name}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="chat-area">
                        <div class="chat-header">
                            <h3>Jamie O</h3>
                            <div class="coach-badge">Your Dad is the Best Coach ever!</div>
                        </div>
                        
                        <div class="messages-container">
                            <div class="message outgoing">
                                <div class="message-author">Brooklyn Ridley</div>
                                <div class="message-content">Stop the glaze Jamie</div>
                            </div>
                        </div>
                        
                        <div class="message-input-area">
                            <div class="input-group">
                                <button class="btn btn-icon">😀</button>
                                <input type="text" placeholder="Type a message..." class="message-input">
                                <button class="btn btn-primary" onclick="app.sendMessage()">Send</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <style>
                .notes-page {
                    max-width: 1200px;
                    height: 600px;
                }
                
                .notes-header {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    margin-bottom: 2rem;
                }
                
                .notes-layout {
                    display: grid;
                    grid-template-columns: 250px 1fr;
                    height: 500px;
                    border: 1px solid #e5e7eb;
                    border-radius: 12px;
                    overflow: hidden;
                }
                
                .players-sidebar {
                    background: #f9fafb;
                    border-right: 1px solid #e5e7eb;
                    padding: 1rem;
                }
                
                .players-sidebar h3 {
                    margin-bottom: 1rem;
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: #374151;
                }
                
                .players-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                
                .player-item {
                    padding: 0.75rem;
                    background: white;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                    font-size: 0.875rem;
                }
                
                .player-item:hover {
                    background: #e5e7eb;
                }
                
                .player-item.selected {
                    background: #3b82f6;
                    color: white;
                }
                
                .chat-area {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                }
                
                .chat-header {
                    background: white;
                    padding: 1rem;
                    border-bottom: 1px solid #e5e7eb;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .coach-badge {
                    background: #e0e7ff;
                    color: #3730a3;
                    padding: 0.5rem 1rem;
                    border-radius: 20px;
                    font-size: 0.75rem;
                }
                
                .messages-container {
                    flex: 1;
                    padding: 1rem;
                    background: #fafafa;
                    overflow-y: auto;
                }
                
                .message {
                    margin-bottom: 1rem;
                    max-width: 70%;
                }
                
                .message.outgoing {
                    margin-left: auto;
                    text-align: right;
                }
                
                .message-author {
                    font-size: 0.75rem;
                    color: #6b7280;
                    margin-bottom: 0.25rem;
                }
                
                .message-content {
                    background: #3b82f6;
                    color: white;
                    padding: 0.75rem 1rem;
                    border-radius: 18px;
                    display: inline-block;
                }
                
                .message-input-area {
                    background: white;
                    padding: 1rem;
                    border-top: 1px solid #e5e7eb;
                }
                
                .input-group {
                    display: flex;
                    gap: 0.5rem;
                    align-items: center;
                }
                
                .message-input {
                    flex: 1;
                    padding: 0.75rem;
                    border: 1px solid #d1d5db;
                    border-radius: 20px;
                    outline: none;
                }
                
                .btn-icon {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #f3f4f6;
                    border: 1px solid #d1d5db;
                }
            </style>
        `;
    }

    // Render lineup creation interface with roster management and drag-and-drop functionality
    renderLineupCreator(container) {
        container.innerHTML = `
            <div class="lineup-creator">
                <div class="lineup-header">
                    <button class="btn btn-secondary back-btn" onclick="app.goBackToDashboard()">
                        ← Back to Dashboard
                    </button>
                    <h2>Lineup Creator</h2>
                </div>
                
                <div class="lineup-layout">
                    <div class="lineup-sidebar">
                        <div class="lineup-tabs">
                            <button class="tab-btn active" onclick="app.switchLineupTab('starters')">Starters</button>
                            <button class="tab-btn" onclick="app.switchLineupTab('bench')">Bench</button>
                            <button class="tab-btn" onclick="app.switchLineupTab('lineup1')">Lineup 1</button>
                            <button class="tab-btn" onclick="app.switchLineupTab('lineup2')">Lineup 2</button>
                            <button class="tab-btn" onclick="app.switchLineupTab('lineup3')">Lineup 3</button>
                            <button class="tab-btn new-lineup" onclick="app.createNewLineup()">+ New Lineup</button>
                        </div>
                    </div>
                    
                    <div class="lineup-main">
                        <div class="roster-section">
                            <h3>Roster</h3>
                            <div class="roster-list">
                                ${this.playerStats.map(player => `
                                    <div class="roster-player" draggable="true" onclick="app.addToLineup('${player.name}')">
                                        <span class="player-avatar">👤</span>
                                        <div class="player-info">
                                            <div class="player-name">${player.name}</div>
                                            <div class="player-position">${player.position}</div>
                                        </div>
                                        <button class="add-btn">⊕</button>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="lineup-section">
                            <div class="lineup-controls">
                                <input type="text" placeholder="Name: ___" class="lineup-name-input">
                                <button class="btn btn-outline suggest-btn">
                                    Suggest Lineup: <select><option>Based on ></option></select>
                                </button>
                            </div>
                            
                            <div class="lineup-list">
                                <div class="lineup-item">
                                    <span class="lineup-number">1.</span>
                                    <span class="lineup-player">Brooklyn Ridley</span>
                                </div>
                                <div class="lineup-item">
                                    <span class="lineup-number">2.</span>
                                    <span class="lineup-player">Surya Loganathan</span>
                                </div>
                                <div class="lineup-item">
                                    <span class="lineup-number">3.</span>
                                    <span class="lineup-player">Kevin Yu</span>
                                </div>
                                <div class="lineup-item">
                                    <span class="lineup-number">4.</span>
                                    <span class="lineup-player empty">___</span>
                                </div>
                                <div class="lineup-item">
                                    <span class="lineup-number">5.</span>
                                    <span class="lineup-player empty">___</span>
                                </div>
                            </div>
                            
                            <div class="lineup-actions">
                                <button class="btn btn-secondary" onclick="app.cancelLineup()">Cancel</button>
                                <button class="btn btn-primary" onclick="app.createLineup()">Create</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <style>
                .lineup-creator {
                    max-width: 1200px;
                    height: 700px;
                }
                
                .lineup-header {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    margin-bottom: 2rem;
                }
                
                .lineup-layout {
                    display: grid;
                    grid-template-columns: 200px 1fr;
                    height: 600px;
                    border: 1px solid #e5e7eb;
                    border-radius: 12px;
                    overflow: hidden;
                }
                
                .lineup-sidebar {
                    background: #f9fafb;
                    border-right: 1px solid #e5e7eb;
                    padding: 1rem;
                }
                
                .lineup-tabs {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                
                .tab-btn {
                    padding: 0.75rem;
                    background: white;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    text-align: left;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .tab-btn:hover {
                    background: #e5e7eb;
                }
                
                .tab-btn.active {
                    background: #0ea5e9;
                    color: white;
                    border-color: #0ea5e9;
                }
                
                .tab-btn.new-lineup {
                    background: #f3f4f6;
                    border-style: dashed;
                    color: #6b7280;
                }
                
                .lineup-main {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    height: 100%;
                }
                
                .roster-section, .lineup-section {
                    padding: 1.5rem;
                }
                
                .roster-section {
                    border-right: 1px solid #e5e7eb;
                }
                
                .roster-section h3, .lineup-section h3 {
                    margin-bottom: 1rem;
                    color: #1f2937;
                }
                
                .roster-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    max-height: 400px;
                    overflow-y: auto;
                }
                
                .roster-player {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem;
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .roster-player:hover {
                    border-color: #3b82f6;
                    transform: translateY(-1px);
                }
                
                .player-avatar {
                    font-size: 1.25rem;
                }
                
                .player-info {
                    flex: 1;
                }
                
                .player-name {
                    font-weight: 500;
                    color: #1f2937;
                }
                
                .player-position {
                    font-size: 0.75rem;
                    color: #6b7280;
                }
                
                .add-btn {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .lineup-controls {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                    align-items: center;
                }
                
                .lineup-name-input {
                    flex: 1;
                    padding: 0.5rem;
                    border: 1px solid #d1d5db;
                    border-radius: 4px;
                }
                
                .suggest-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .lineup-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                    margin-bottom: 2rem;
                }
                
                .lineup-item {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 0.75rem;
                    background: #f9fafb;
                    border-radius: 6px;
                }
                
                .lineup-number {
                    font-weight: 600;
                    color: #374151;
                    min-width: 20px;
                }
                
                .lineup-player {
                    flex: 1;
                    color: #1f2937;
                }
                
                .lineup-player.empty {
                    color: #9ca3af;
                    font-style: italic;
                }
                
                .lineup-actions {
                    display: flex;
                    gap: 1rem;
                    justify-content: flex-end;
                }
            </style>
        `;
    }

    // Select a team and navigate to manager dashboard
    selectTeam(teamId) {
        this.managerState.selectedTeam = teamId;
        this.managerState.currentView = 'dashboard';
        this.renderManagerView(document.getElementById('manager-content'));
    }

    // Navigate back to team selection screen and reset selected team
    goBackToTeamSelection() {
        this.managerState.currentView = 'team-selection';
        this.managerState.selectedTeam = null;
        this.renderManagerView(document.getElementById('manager-content'));
    }

    // Navigate back to manager dashboard from sub-pages
    goBackToDashboard() {
        this.managerState.currentView = 'dashboard';
        this.renderManagerView(document.getElementById('manager-content'));
    }

    // Navigate to team notes and communication page
    goToNotes() {
        this.managerState.currentView = 'notes';
        this.renderManagerView(document.getElementById('manager-content'));
    }

    // Navigate to lineup creator and management interface
    goToLineupCreator() {
        this.managerState.currentView = 'lineup-creator';
        this.renderManagerView(document.getElementById('manager-content'));
    }

    // Placeholder function for new team creation feature
    createNewTeam() {
        alert('New Team creation coming soon!');
    }

    // Placeholder function for team details editing feature
    editTeamDetails() {
        alert('Edit Team Details coming soon!');
    }

    // Placeholder function for user invitation feature
    inviteUsers() {
        alert('Invite Users coming soon!');
    }

    // Placeholder function for user archiving feature
    archiveUsers() {
        alert('Archive Users coming soon!');
    }

    // Placeholder function for lineup viewing feature
    viewLineup(type) {
        alert(`Viewing ${type} lineup coming soon!`);
    }

    // Placeholder function for player chat selection
    selectPlayerForChat(playerName) {
        alert(`Opening chat with ${playerName}`);
    }

    // Send message functionality with input validation and clearing
    sendMessage() {
        const input = document.querySelector('.message-input');
        if (input && input.value.trim()) {
            alert(`Message sent: ${input.value}`);
            input.value = '';
        }
    }

    // Switch between different lineup tabs and update active state
    switchLineupTab(tab) {
        // Update active tab
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        alert(`Switched to ${tab} lineup`);
    }

    // Add player to current lineup with placeholder functionality
    addToLineup(playerName) {
        alert(`Added ${playerName} to lineup`);
    }

    // Placeholder function for creating new lineup
    createNewLineup() {
        alert('Creating new lineup...');
    }

    // Cancel lineup creation and return to dashboard
    cancelLineup() {
        this.goBackToDashboard();
    }

    // Create lineup and return to dashboard with success confirmation
    createLineup() {
        alert('Lineup created successfully!');
        this.goBackToDashboard();
    }

    /**
     * PURPOSE: Creates and displays a comprehensive player profile modal with detailed biometric and performance statistics
     * INPUTS: playerName (string representing the player's full name to display in modal)
     * OUTPUTS: Renders interactive modal overlay with player details, statistics, and biometric data
     * JUSTIFICATION: Essential player information interface that provides detailed player profiles for roster management and performance analysis
     * FUTURE ENHANCEMENTS: Add player comparison features, implement performance trends visualization, add player notes and coaching feedback
     */
    showPlayerModal(playerName) {
        const player = this.playerStats.find(p => p.name === playerName);
        if (!player) return;

        // Get initials for avatar
        const initials = player.name.split(' ').map(n => n[0]).join('');

        // Create modal HTML
        const modalHTML = `
            <div class="modal-overlay" id="playerModal">
                <div class="modal-content player-modal-content">
                    <div class="modal-header">
                        <h2>Player Profile</h2>
                        <button class="modal-close" onclick="app.closePlayerModal()">&times;</button>
                    </div>
                    <div class="player-modal-body">
                        <div class="player-modal-header">
                            <div class="player-modal-avatar">
                                <div class="avatar-circle-large">${initials}</div>
                            </div>
                            <div class="player-modal-info">
                                <h3 class="modal-player-name">${player.name}</h3>
                                <p class="modal-player-position">#${player.number} • ${player.position}</p>
                            </div>
                        </div>
                        
                        <div class="biometrics-grid">
                            <div class="biometric-group">
                                <h4>Physical Measurements</h4>
                                <div class="biometric-stats">
                                    <div class="biometric-item">
                                        <span class="biometric-label">Height:</span>
                                        <span class="biometric-value">${player.height}</span>
                                    </div>
                                    <div class="biometric-item">
                                        <span class="biometric-label">Weight:</span>
                                        <span class="biometric-value">${player.weight}</span>
                                    </div>
                                    <div class="biometric-item">
                                        <span class="biometric-label">Age:</span>
                                        <span class="biometric-value">${player.age} years</span>
                                    </div>
                                    <div class="biometric-item">
                                        <span class="biometric-label">Wingspan:</span>
                                        <span class="biometric-value">${player.wingspan}</span>
                                    </div>
                                    <div class="biometric-item">
                                        <span class="biometric-label">Vertical Leap:</span>
                                        <span class="biometric-value">${player.vertical}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="biometric-group">
                                <h4>Season Statistics</h4>
                                <div class="biometric-stats">
                                    <div class="biometric-item">
                                        <span class="biometric-label">Points per Game:</span>
                                        <span class="biometric-value">${player.stats.ppg}</span>
                                    </div>
                                    <div class="biometric-item">
                                        <span class="biometric-label">Assists per Game:</span>
                                        <span class="biometric-value">${player.stats.apg}</span>
                                    </div>
                                    <div class="biometric-item">
                                        <span class="biometric-label">Rebounds per Game:</span>
                                        <span class="biometric-value">${player.stats.rpg}</span>
                                    </div>
                                    <div class="biometric-item">
                                        <span class="biometric-label">Steals per Game:</span>
                                        <span class="biometric-value">${player.stats.spg}</span>
                                    </div>
                                    <div class="biometric-item">
                                        <span class="biometric-label">Minutes per Game:</span>
                                        <span class="biometric-value">${player.stats.mpg}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add event listener for clicking outside modal
        document.getElementById('playerModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closePlayerModal();
            }
        });
    }

    // Close and remove the player profile modal from the DOM
    closePlayerModal() {
        const modal = document.getElementById('playerModal');
        if (modal) {
            modal.remove();
        }
    }
}

// Initialize the app when DOM is loaded (only on index page)
let app; // Global app instance

document.addEventListener('DOMContentLoaded', () => {
    // Only initialize on index page to avoid conflicts with other pages
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
        app = new TeamForgeApp();
        
        // Make app globally available
        window.app = app;
        
        // Don't auto-load dashboard here - let the auth check handle it
        // This prevents loading dashboard before auth check completes
    }
});
