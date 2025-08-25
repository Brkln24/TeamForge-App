    /**
     * File Name: calendar.js
     * Purpose: Handles event creation, player availability tracking, game confirmations, 
     *          and schedule coordination across different teams.
     * Author: Brooklyn Ridley
     * Date Created:  27th July 2025
     * Last Modified: 25th August 2025
        */
class CalendarApp {
    constructor() {
        // Initialize with actual current date
        const today = new Date();
        this.currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        this.selectedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        this.currentUser = null;
        this.userTeams = [];
        this.events = {};
        this.init();
    }

    // Initialize calendar application with authentication check and data loading
    async init() {
        try {
            // Check authentication and get user
            this.currentUser = window.db?.getCurrentUser();
            if (!this.currentUser) {
                window.location.href = 'login.html';
                return;
            }

            // Load user teams and events
            await this.loadUserData();
            
            // Check for pending game confirmations
            await this.checkPendingGameConfirmations();
            
            this.renderCalendar();
        } catch (error) {
            console.error('Error initializing calendar:', error);
        }
    }

    /**
     * PURPOSE: Loads and organizes all events for the current user's teams with role-based filtering and duplicate prevention
     * INPUTS: None (uses this.currentUser and accesses database)
     * OUTPUTS: Populates this.events object with date-keyed arrays of filtered and enhanced event data
     * JUSTIFICATION: Core data loading function that handles complex role-based access control, prevents duplicate event display for multi-team coaches, and enhances event data with team-specific display information
     * FUTURE ENHANCEMENTS: Add team selector for users with multiple teams, implement event caching for performance, add event synchronization with external calendars
     */
    async loadUserData() {
        // Get user's teams
        this.userTeams = window.db.getUserTeams(this.currentUser.id);
        
        // Set current team (use first team for now, could be enhanced with team selector)
        this.currentTeam = this.userTeams.length > 0 ? this.userTeams[0] : null;
        
        // Load events for user's teams
        this.events = {};
        const processedEventIds = new Set(); // Track processed events to avoid duplicates
        
        for (const team of this.userTeams) {
            let teamEvents = window.db.getTeamEvents(team.id); // Use new method that includes opponent games
            
            // Filter events based on user role and game confirmation status
            const userRole = team.membership.role;
            if (userRole === 'player') {
                // Players only see confirmed games or non-game events
                teamEvents = teamEvents.filter(event => {
                    if (event.event_type === 'game') {
                        return event.is_confirmed === true;
                    }
                    return true; // Show all non-game events
                });
            }
            // Coaches and managers see all events including pending games
            
            teamEvents.forEach(event => {
                // Skip if this event has already been processed (prevents duplicates for coaches managing both teams)
                if (processedEventIds.has(event.id)) {
                    return;
                }
                processedEventIds.add(event.id);
                
                const dateKey = this.getDateKey(new Date(event.event_date));
                if (!this.events[dateKey]) {
                    this.events[dateKey] = [];
                }
                
                // Determine if this team is the home team (creator) or away team (opponent)
                const isHomeTeam = event.team_id === team.id;
                
                // For coaches managing both teams, show the game as "Team A vs Team B" without specifying which is home/away
                let displayTeamName = team.name;
                if (event.event_type === 'game' && event.opponent_team_id) {
                    // Check if this coach manages both teams
                    const opponentTeam = window.db.getTeamById(event.opponent_team_id);
                    const coachManagesBothTeams = this.userTeams.some(userTeam => userTeam.id === event.opponent_team_id);
                    
                    if (coachManagesBothTeams) {
                        // Show as neutral game title when coach manages both teams
                        const homeTeam = window.db.getTeamById(event.team_id);
                        displayTeamName = `${homeTeam?.name || 'Team'} vs ${opponentTeam?.name || 'Opponent'}`;
                    } else {
                        // Show from this team's perspective
                        displayTeamName = isHomeTeam ? team.name : `${team.name} (Away)`;
                    }
                }
                
                this.events[dateKey].push({
                    ...event,
                    team_name: displayTeamName,
                    team_color: team.color,
                    user_role: userRole,
                    is_home_team: isHomeTeam
                });
            });
        }
    }

    // Check for and display pending game confirmation requests for the current user
    async checkPendingGameConfirmations() {
        const pendingConfirmations = window.db.getUserPendingConfirmations(this.currentUser.id);
        
        for (const confirmation of pendingConfirmations) {
            const game = window.db.getEventById(confirmation.game_id);
            const requestingTeam = window.db.getTeamById(confirmation.requesting_team_id);
            
            if (game && requestingTeam) {
                this.showGameConfirmationModal(confirmation, game, requestingTeam);
            }
        }
    }

    // Display modal for confirming or declining game requests
    showGameConfirmationModal(confirmation, game, requestingTeam) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal game-confirmation-modal">
                <div class="modal-header">
                    <h3><i class="bi bi-trophy-fill"></i> Game Confirmation Request</h3>
                </div>
                <div class="modal-body">
                    <div class="confirmation-details">
                        <h4>${requestingTeam.name} has challenged your team to a game!</h4>
                        <div class="game-info">
                            <p><strong>Game:</strong> ${game.title}</p>
                            <p><strong>Date:</strong> ${new Date(game.event_date).toLocaleDateString('en-AU', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}</p>
                            <p><strong>Location:</strong> ${game.location || 'TBD'}</p>
                            ${game.description ? `<p><strong>Notes:</strong> ${game.description}</p>` : ''}
                        </div>
                        <div class="confirmation-actions">
                            <button class="btn btn-success" onclick="calendarApp.confirmGame('${confirmation.game_id}', '${confirmation.id}')">
                                ✓ Accept Game
                            </button>
                            <button class="btn btn-danger" onclick="calendarApp.declineGame('${confirmation.game_id}', '${confirmation.id}')">
                                ✗ Decline Game
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    // Confirm a game request and refresh calendar display
    confirmGame(gameId, confirmationId) {
        try {
            window.db.confirmGame(gameId, this.currentUser.id);
            this.showMessage('Game confirmed! It will now be visible to all players.', 'success');
            this.closeModals();
            this.loadUserData();
            this.renderCalendar();
        } catch (error) {
            console.error('Error confirming game:', error);
            this.showMessage('Failed to confirm game', 'error');
        }
    }

    // Decline a game request and refresh calendar display
    declineGame(gameId, confirmationId) {
        try {
            window.db.declineGame(gameId, this.currentUser.id);
            this.showMessage('Game declined and removed from calendar.', 'info');
            this.closeModals();
            this.loadUserData();
            this.renderCalendar();
        } catch (error) {
            console.error('Error declining game:', error);
            this.showMessage('Failed to decline game', 'error');
        }
    }

    // Close all open modal dialogs
    closeModals() {
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(modal => modal.remove());
    }

    /**
     * PURPOSE: Renders the complete calendar interface with role-based navigation and event display
     * INPUTS: None (uses this.currentDate, this.selectedDate, this.events and user permissions)
     * OUTPUTS: Dynamically generates and displays the calendar widget, event panel, and navigation controls in the DOM
     * JUSTIFICATION: Central UI rendering function that creates the main calendar interface with proper role-based access controls and responsive design for different screen sizes
     * FUTURE ENHANCEMENTS: Add calendar view options (month/week/day), implement drag-and-drop event scheduling, add print-friendly calendar view
     */
    renderCalendar() {
        const container = document.getElementById('calendar-content');
        const canAddEvents = window.auth?.hasPermission('add_events');
        
        container.innerHTML = `
            <div class="calendar-layout">
                <!-- Calendar Widget -->
                <div class="calendar-widget">
                    <div class="calendar-header">
                        <button class="calendar-nav-btn" onclick="calendarApp.previousMonth()">‹</button>
                        <h2 class="calendar-title">${this.getMonthYear()}</h2>
                        <button class="calendar-nav-btn" onclick="calendarApp.nextMonth()">›</button>
                    </div>
                    
                    <div class="calendar-days-header">
                        <div class="calendar-day-label">Mon</div>
                        <div class="calendar-day-label">Tues</div>
                        <div class="calendar-day-label">Wed</div>
                        <div class="calendar-day-label">Thurs</div>
                        <div class="calendar-day-label">Fri</div>
                        <div class="calendar-day-label">Sat</div>
                        <div class="calendar-day-label">Sun</div>
                    </div>
                    
                    <div class="calendar-grid">
                        ${this.generateCalendarDays()}
                    </div>
                </div>

                <!-- Events Panel -->
                <div class="events-panel">
                    <div class="events-header">
                        <div class="events-date">${this.getSelectedDateString()}</div>
                        <div class="events-nav">
                            ${canAddEvents ? '<button class="add-event-btn" onclick="calendarApp.showAddEventModal()" title="Add Event">+ Event</button>' : ''}
                            <button class="events-nav-btn" onclick="calendarApp.previousDay()">‹</button>
                            <button class="events-nav-btn" onclick="calendarApp.nextDay()">›</button>
                        </div>
                    </div>
                    
                    <div class="events-list">
                        ${this.renderEventsForDate()}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * PURPOSE: Generates and displays events for the currently selected date with role-specific action buttons and visual indicators
     * INPUTS: None (uses this.selectedDate and this.events to find relevant events)
     * OUTPUTS: Returns HTML string containing formatted event cards with appropriate styling and interactive elements
     * JUSTIFICATION: Critical display function that handles complex role-based rendering of event details, availability controls for players, and management actions for coaches/managers
     * FUTURE ENHANCEMENTS: Add event filtering options, implement recurring event display, add event import/export functionality
     */
    renderEventsForDate() {
        const dateKey = this.getDateKey(this.selectedDate);
        const dayEvents = this.events[dateKey] || [];
        
        if (dayEvents.length === 0) {
            return '<div class="no-events">No events scheduled for this day</div>';
        }

        return dayEvents.map(event => {
            const eventTime = new Date(event.event_date).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            const gameClass = event.event_type === 'game' ? 'game-event' : '';
            const pendingClass = event.event_type === 'game' && event.is_confirmed === false ? 'pending-game' : '';
            
            // Check if game is finalized to hide delete button
            const isFinalized = event.event_type === 'game' && 
                (localStorage.getItem(`teamforge_game_finalized_${event.id}`) || event.is_finalized);
            
            const deleteButton = isFinalized ? '' : 
                `<button class="event-delete-btn" onclick="calendarApp.deleteEvent('${event.id}')" title="Delete Event">✖</button>`;
            
            // Add pending confirmation badge for unconfirmed games
            const pendingBadge = event.event_type === 'game' && event.is_confirmed === false ? 
                '<div class="pending-badge">⏳ Awaiting Confirmation</div>' : '';
            
            return `
                <div class="event-item ${event.event_type} ${gameClass} ${pendingClass}" style="border-left-color: ${event.team_color}">
                    ${pendingBadge}
                    <div class="event-content-grid">
                        <!-- Delete Button - Positioned Absolute Top Right (hidden for finalized games) -->
                        <div class="grid-delete">
                            ${deleteButton}
                        </div>
                        
                        <!-- Title - Centered -->
                        <div class="grid-title">${event.title}</div>
                        
                        <!-- Event Type Badge - Centered -->
                        <div class="grid-badge">
                            <div class="event-type-badge ${event.event_type}">
                                ${this.getEventTypeIcon(event.event_type)} ${event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1)}
                            </div>
                        </div>
                        
                        <!-- Time - Centered -->
                        <div class="grid-time">
                            <strong>Time:</strong> ${eventTime}
                        </div>
                        
                        <!-- Location - Centered -->
                        <div class="grid-location">
                            <strong>Location:</strong> ${event.location || 'TBD'}
                        </div>
                        
                        <!-- Notes - Centered (only if notes exist) -->
                        ${event.description ? `
                        <div class="grid-notes">
                            <strong>Notes:</strong> ${event.description}
                        </div>
                        ` : ''}
                        
                        <!-- Action Buttons - Centered -->
                        <div class="grid-actions">
                            ${this.renderEventActions(event)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Generate role-specific action buttons for events (edit, stats, availability)
    renderEventActions(event) {
        const userRole = this.currentUser.role;
        const actions = [];

        if (['coach', 'manager', 'assistant_coach'].includes(userRole)) {
            actions.push(`
                <button class="event-action-btn" onclick="calendarApp.editEvent('${event.id}')" title="Edit Event">
                    <i class="bi bi-pencil-fill"></i>
                </button>
            `);
            
            if (event.event_type === 'game') {
                actions.push(`
                    <button class="event-action-btn" onclick="calendarApp.manageGameStats('${event.id}')" title="Manage Stats">
                        <i class="bi bi-bar-chart-fill"></i>
                    </button>
                `);
            }
            
            actions.push(`
                <button class="event-action-btn" onclick="calendarApp.viewAvailability('${event.id}')" title="View Availability">
                    <i class="bi bi-people-fill"></i>
                </button>
            `);
        } else if (userRole === 'player') {
            // Check current availability status
            const availability = window.db.getPlayerAvailability(this.currentUser.id, event.id);
            const currentStatus = availability.length > 0 ? availability[0].status : null;
            
            actions.push(`
                <div class="availability-controls">
                    <button class="availability-btn ${currentStatus === 'available' ? 'active' : ''}" 
                            onclick="calendarApp.setAvailability('${event.id}', 'available')" title="Available">
                        ✅
                    </button>
                    <button class="availability-btn ${currentStatus === 'maybe' ? 'active' : ''}" 
                            onclick="calendarApp.setAvailability('${event.id}', 'maybe')" title="Maybe">
                        ❓
                    </button>
                    <button class="availability-btn ${currentStatus === 'unavailable' ? 'active' : ''}" 
                            onclick="calendarApp.setAvailability('${event.id}', 'unavailable')" title="Unavailable">
                        ❌
                    </button>
                </div>
            `);
            
            if (event.event_type === 'game') {
                actions.push(`
                    <button class="event-action-btn" onclick="calendarApp.viewGameStats('${event.id}')" title="View Stats">
                        <i class="bi bi-bar-chart-fill"></i>
                    </button>
                `);
            }
        } else if (userRole === 'parent') {
            // Parents can view game stats but cannot set availability
            if (event.event_type === 'game') {
                actions.push(`
                    <button class="event-action-btn" onclick="calendarApp.viewGameStats('${event.id}')" title="View Stats">
                        <i class="bi bi-bar-chart-fill"></i>
                    </button>
                `);
            }
        }

        return actions.join('');
    }

    // Event management methods
    // Show the add event modal with permission check
    showAddEventModal() {
        if (!window.auth?.hasPermission('add_events')) {
            alert('You do not have permission to add events.');
            return;
        }

        const modal = this.createEventModal();
        document.body.appendChild(modal);
    }

    /**
     * PURPOSE: Creates a comprehensive event creation/editing modal with dynamic form fields and validation
     * INPUTS: event (optional Event object for editing, null for new events)
     * OUTPUTS: Returns DOM element containing the complete modal with form fields, validation, and event handlers
     * JUSTIFICATION: Complex modal generation function that handles both creation and editing workflows with dynamic opponent selection, location management, and proper form validation
     * FUTURE ENHANCEMENTS: Add recurring event options, implement event templates, add conflict detection for overlapping events
     */
    createEventModal(event = null) {
        const isEdit = event !== null;
        const modalTitle = isEdit ? 'Edit Event' : 'Add New Event';
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${modalTitle}</h3>
                    <button onclick="calendarApp.closeModal()" class="close-btn">×</button>
                </div>
                <form id="eventForm" class="event-form">
                    <div class="form-group">
                        <label>Team</label>
                        <div class="select-wrapper">
                            <select name="team_id" id="team_id" required onchange="calendarApp.updateOpponentTeams(this.value)">
                                <option value="">Select team</option>
                                ${this.userTeams.map(team => `
                                    <option value="${team.id}" ${event?.team_id === team.id ? 'selected' : ''}>
                                        ${team.name}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Event Title</label>
                        <input type="text" name="title" id="event_title" value="${event?.title || ''}" placeholder="Enter event title" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Event Type</label>
                        <div class="select-wrapper">
                            <select name="event_type" id="event_type" required onchange="calendarApp.toggleOpponentField(this.value)">
                                <option value="practice" ${event?.event_type === 'practice' ? 'selected' : ''}>Practice</option>
                                <option value="game" ${event?.event_type === 'game' ? 'selected' : ''}>Game</option>
                                <option value="meeting" ${event?.event_type === 'meeting' ? 'selected' : ''}>Meeting</option>
                                <option value="other" ${event?.event_type === 'other' ? 'selected' : ''}>Other</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group" id="opponentField" style="display: ${event?.event_type === 'game' ? 'block' : 'none'};">
                        <label>Opponent Team</label>
                        <div class="select-wrapper">
                            <select name="opponent_team_id" id="opponent_team_id" onchange="calendarApp.updateGameTitle()">
                                <option value="">Select opponent team</option>
                            ${this.getOpponentTeamsForSelect(event?.opponent_team_id)}
                            </select>
                        </div>
                        <small class="field-help">Only teams from your league (${this.currentTeam?.league || 'Unknown'}) are shown</small>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Date</label>
                            <input type="date" name="event_date" 
                                   value="${event ? this.formatDateForInput(new Date(event.event_date)) : this.formatDateForInput(this.selectedDate)}" 
                                   ${!isEdit ? `min="${this.getTodayDateString()}"` : ''}
                                   required>
                        </div>
                        <div class="form-group">
                            <label>Time</label>
                            <input type="time" name="event_time" value="${event ? this.formatTimeForInput(new Date(event.event_date)) : '18:00'}" required>
                        </div>
                    </div>
                    
                    <div class="form-group" id="locationField">
                        <label>Location</label>
                        <div class="select-wrapper" id="gameLocationSelect" style="display: none;">
                            <select name="location_select" id="location_select">
                                <option value="">Select venue</option>
                                <option value="home">Home Venue (${this.currentTeam?.home_venue || 'Not set'})</option>
                            </select>
                        </div>
                        <div class="select-wrapper" id="trainingLocationSelect" style="display: none;">
                            <select name="training_location_select" id="training_location_select">
                                <option value="">Select venue</option>
                                <option value="training">Training Venue (${this.currentTeam?.training_venue || 'Not set'})</option>
                            </select>
                        </div>
                        <input type="text" name="location" id="location_input" value="${event?.location || ''}" placeholder="Or enter custom venue">
                    </div>
                    
                    <div class="form-group">
                        <label>Description</label>
                        <textarea name="description" placeholder="Enter additional details or notes...">${event?.description || ''}</textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" onclick="calendarApp.closeModal()" class="btn-secondary">Cancel</button>
                        <button type="submit" class="btn-primary">${isEdit ? 'Update Event' : 'Create Event'}</button>
                    </div>
                </form>
            </div>
        `;

        // Add form submit handler
        const form = modal.querySelector('#eventForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEvent(form, event);
        });

        // Initialize form state after modal is added to DOM
        setTimeout(() => {
            const eventTypeSelect = document.getElementById('event_type');
            if (eventTypeSelect) {
                this.toggleOpponentField(eventTypeSelect.value);
                this.updateLocationFields(eventTypeSelect.value);
                this.setupLocationHandlers();
                if (eventTypeSelect.value === 'game') {
                    this.populateOpponentVenues();
                }
            }
        }, 0);

        return modal;
    }

    // Toggle opponent selection field visibility based on event type
    toggleOpponentField(eventType) {
        const opponentField = document.getElementById('opponentField');
        const titleField = document.getElementById('event_title');
        
        if (opponentField && titleField) {
            if (eventType === 'game') {
                opponentField.style.display = 'block';
                titleField.readOnly = true;
                titleField.style.backgroundColor = '#f7fafc';
                titleField.placeholder = 'Title will be auto-generated';
                
                // Update opponent teams for the currently selected team
                const teamSelect = document.getElementById('team_id');
                if (teamSelect && teamSelect.value) {
                    this.updateOpponentTeams(teamSelect.value);
                }
                
                this.updateGameTitle();
                this.populateOpponentVenues();
            } else {
                opponentField.style.display = 'none';
                titleField.readOnly = false;
                titleField.style.backgroundColor = '';
                titleField.placeholder = 'Enter event title';
            }
        }
        
        // Update location fields based on event type
        this.updateLocationFields(eventType);
    }

    // Auto-generate game title based on selected teams
    updateGameTitle() {
        const eventTypeSelect = document.getElementById('event_type');
        const teamSelect = document.getElementById('team_id');
        const opponentSelect = document.getElementById('opponent_team_id');
        const titleField = document.getElementById('event_title');
        
        if (!eventTypeSelect || !teamSelect || !opponentSelect || !titleField) return;
        
        // Only auto-generate title for games
        if (eventTypeSelect.value !== 'game') return;
        
        const selectedTeamId = teamSelect.value;
        const selectedOpponentId = opponentSelect.value;
        
        if (selectedTeamId) {
            const homeTeam = window.db.getTeamById(selectedTeamId);
            
            if (selectedOpponentId) {
                const awayTeam = window.db.getTeamById(selectedOpponentId);
                if (homeTeam && awayTeam) {
                    titleField.value = `${homeTeam.name} vs ${awayTeam.name}`;
                }
            } else if (homeTeam) {
                titleField.value = `${homeTeam.name} vs [Select Opponent]`;
            }
        } else {
            titleField.value = '[Select Team] vs [Select Opponent]';
        }
    }

    // Update opponent team dropdown based on selected team and league
    updateOpponentTeams(selectedTeamId) {
        const opponentSelect = document.getElementById('opponent_team_id');
        if (!opponentSelect || !selectedTeamId) return;

        // Get the selected team's league
        const selectedTeam = window.db.getTeamById(selectedTeamId);
        if (!selectedTeam || !selectedTeam.league) {
            opponentSelect.innerHTML = '<option value="">No teams available</option>';
            this.updateGameTitle(); // Update title when team changes
            return;
        }

        // Get teams from the same league, excluding the selected team
        const opponentTeams = window.db.getTeamsByLeague(selectedTeam.league, selectedTeamId);
        
        if (opponentTeams.length === 0) {
            opponentSelect.innerHTML = '<option value="">No opponent teams found in league</option>';
            this.updateGameTitle(); // Update title when team changes
            return;
        }

        // Update the opponent dropdown
        opponentSelect.innerHTML = `
            <option value="">Select opponent team</option>
            ${opponentTeams.map(team => `
                <option value="${team.id}">
                    ${team.name} (${team.league})
                </option>
            `).join('')}
        `;
        
        this.updateGameTitle(); // Update title when team changes
    }

    // Get all teams available as opponents for the current team
    getAllTeams() {
        // Get teams from the same league as the current user's active team
        if (!this.currentUser || !this.currentTeam) {
            return [];
        }
        
        // Get teams from the same league, excluding the current team
        return window.db.getTeamOpponents(this.currentTeam.id);
    }

    // Generate HTML options for opponent team selection dropdown
    getOpponentTeamsForSelect(selectedOpponentId = null) {
        const opponentTeams = this.getAllTeams();
        
        if (opponentTeams.length === 0) {
            return '<option value="" disabled>No teams found in your league</option>';
        }
        
        return opponentTeams.map(team => `
            <option value="${team.id}" ${selectedOpponentId === team.id ? 'selected' : ''}>
                ${team.name} (${team.league})
            </option>
        `).join('');
    }

    // Show/hide location selection dropdowns based on event type
    updateLocationFields(eventType) {
        const gameLocationSelect = document.getElementById('gameLocationSelect');
        const trainingLocationSelect = document.getElementById('trainingLocationSelect');
        
        if (eventType === 'game') {
            gameLocationSelect.style.display = 'block';
            trainingLocationSelect.style.display = 'none';
        } else if (eventType === 'practice') {
            gameLocationSelect.style.display = 'none';
            trainingLocationSelect.style.display = 'block';
        } else {
            gameLocationSelect.style.display = 'none';
            trainingLocationSelect.style.display = 'none';
        }
    }

    // Add opponent team venues to the location selection dropdown
    populateOpponentVenues() {
        const opponentTeams = this.getAllTeams();
        const gameLocationSelect = document.getElementById('location_select');
        
        if (gameLocationSelect && opponentTeams.length > 0) {
            // Add opponent home venues
            opponentTeams.forEach(team => {
                if (team.home_venue) {
                    const option = document.createElement('option');
                    option.value = team.home_venue;
                    option.textContent = `${team.name} Home Venue (${team.home_venue})`;
                    gameLocationSelect.appendChild(option);
                }
            });
        }
    }

    // Set up event handlers for location selection dropdowns and inputs
    setupLocationHandlers() {
        // Game location handler
        const gameLocationSelect = document.getElementById('location_select');
        const trainingLocationSelect = document.getElementById('training_location_select');
        const locationInput = document.getElementById('location_input');

        if (gameLocationSelect) {
            gameLocationSelect.addEventListener('change', (e) => {
                if (e.target.value === 'home') {
                    locationInput.value = this.currentTeam?.home_venue || '';
                } else if (e.target.value) {
                    locationInput.value = e.target.value;
                }
            });
        }

        if (trainingLocationSelect) {
            trainingLocationSelect.addEventListener('change', (e) => {
                if (e.target.value === 'training') {
                    locationInput.value = this.currentTeam?.training_venue || '';
                } else if (e.target.value) {
                    locationInput.value = e.target.value;
                }
            });
        }

        // Clear select when typing in input
        if (locationInput) {
            locationInput.addEventListener('input', () => {
                if (gameLocationSelect) gameLocationSelect.value = '';
                if (trainingLocationSelect) trainingLocationSelect.value = '';
            });
        }
    }

    /**
     * PURPOSE: Processes and saves event data with comprehensive validation and date handling for both new and existing events
     * INPUTS: form (HTML form element with event data), existingEvent (optional Event object for updates)
     * OUTPUTS: Creates or updates event in database, refreshes calendar display, shows success/error messages
     * JUSTIFICATION: Critical data persistence function that ensures proper event validation, prevents past-date creation, and maintains data integrity across event lifecycle
     * FUTURE ENHANCEMENTS: Add bulk event creation, implement event series management, add conflict resolution for overlapping events
     */
    async saveEvent(form, existingEvent = null) {
        try {
            const formData = new FormData(form);
            const eventDate = new Date(`${formData.get('event_date')}T${formData.get('event_time')}`);
            
            // Validate that the event date is not in the past (only for new events)
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Start of today
            const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate()); // Start of event day
            
            if (!existingEvent && eventDay < today) {
                alert('Cannot create events for past dates. Please select today or a future date.');
                return;
            }
            
            const eventData = {
                team_id: formData.get('team_id'),
                title: formData.get('title'),
                event_type: formData.get('event_type'),
                event_date: eventDate.toISOString(),
                location: formData.get('location'),
                description: formData.get('description'),
                opponent_team_id: formData.get('opponent_team_id') || null
            };

            if (existingEvent) {
                window.db.updateEvent(existingEvent.id, eventData);
                this.showMessage('Event updated successfully!', 'success');
            } else {
                window.db.createEvent(eventData);
                this.showMessage('Event created successfully!', 'success');
            }

            await this.loadUserData();
            this.renderCalendar();
            this.closeModal();
            
        } catch (error) {
            console.error('Error saving event:', error);
            alert('Failed to save event. Please try again.');
        }
    }

    // Set player availability for an event (with optional note for unavailable status)
    async setAvailability(eventId, status) {
        try {
            const notes = status === 'unavailable' ? 
                prompt('Optional: Add a note about your unavailability') : null;
            
            window.db.setPlayerAvailability(eventId, this.currentUser.id, status, notes);
            this.renderCalendar(); // Refresh to show updated availability
            
        } catch (error) {
            console.error('Error setting availability:', error);
            alert('Failed to update availability. Please try again.');
        }
    }

    // View availability summary for an event (coach/manager feature)
    viewAvailability(eventId) {
        const availability = window.db.getEventAvailability(eventId);
        const event = this.findEventById(eventId);
        
        this.showAvailabilityModal(event, availability);
    }

    // Display modal showing player availability summary and details
    showAvailabilityModal(event, availability) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        
        const availableCount = availability.filter(a => a.status === 'available').length;
        const maybeCount = availability.filter(a => a.status === 'maybe').length;
        const unavailableCount = availability.filter(a => a.status === 'unavailable').length;
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Availability for "${event.title}"</h3>
                    <button onclick="calendarApp.closeModal()" class="close-btn">×</button>
                </div>
                
                <div class="availability-summary">
                    <div class="availability-stat available">
                        <span class="count">${availableCount}</span>
                        <span class="label">Available</span>
                    </div>
                    <div class="availability-stat maybe">
                        <span class="count">${maybeCount}</span>
                        <span class="label">Maybe</span>
                    </div>
                    <div class="availability-stat unavailable">
                        <span class="count">${unavailableCount}</span>
                        <span class="label">Unavailable</span>
                    </div>
                </div>
                
                <div class="availability-list">
                    ${availability.map(a => `
                        <div class="availability-item ${a.status}">
                            <div class="player-info">
                                <span class="player-avatar">${a.user.avatar}</span>
                                <span class="player-name">${a.user.name}</span>
                            </div>
                            <div class="availability-status ${a.status}">
                                ${this.getAvailabilityIcon(a.status)}
                            </div>
                            ${a.notes ? `<div class="availability-note">${a.notes}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    // Get icon representation for availability status
    getAvailabilityIcon(status) {
        const icons = {
            'available': '✅',
            'maybe': '❓',
            'unavailable': '❌'
        };
        return icons[status] || '❓';
    }

    // Get icon representation for different event types
    getEventTypeIcon(type) {
        const icons = {
            'game': '<i class="bi bi-trophy-fill"></i>',
            'practice': '<i class="bi bi-arrow-repeat"></i>',
            'meeting': '<i class="bi bi-chat-dots-fill"></i>',
            'other': '<i class="bi bi-calendar3"></i>'
        };
        return icons[type] || '<i class="bi bi-calendar3"></i>';
    }

    // Find an event by ID across all date keys
    findEventById(eventId) {
        for (const dateKey in this.events) {
            const event = this.events[dateKey].find(e => e.id === eventId);
            if (event) return event;
        }
        return null;
    }

    // Close the currently open modal dialog
    closeModal() {
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            modal.remove();
        }
    }

    // Generate standardized date key string (YYYY-MM-DD format)
    getDateKey(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    // Format date for HTML date input (YYYY-MM-DD)
    formatDateForInput(date) {
        // Use local date components to avoid timezone issues
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Format time for HTML time input (HH:MM)
    formatTimeForInput(date) {
        return date.toTimeString().slice(0, 5);
    }

    // Get today's date as formatted string for date input
    getTodayDateString() {
        const today = new Date();
        return this.formatDateForInput(today);
    }

    // Get current month and year as display string
    getMonthYear() {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
        return `${months[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
    }

    // Get selected date as formatted display string
    getSelectedDateString() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return this.selectedDate.toLocaleDateString('en-US', options);
    }

    // Calendar generation methods (keeping existing logic)
    /**
     * PURPOSE: Generates the complete monthly calendar grid with proper date positioning and event indicators
     * INPUTS: None (uses this.currentDate to determine month and this.events to show event indicators)
     * OUTPUTS: Returns HTML string containing 42 calendar day cells with proper styling and event indicators
     * JUSTIFICATION: Complex calendar layout function that handles month boundaries, weekend positioning, and visual indicators for days with events
     * FUTURE ENHANCEMENTS: Add week view option, implement mini-calendar navigation, add holiday/special date highlighting
     */
    generateCalendarDays() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - (firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1));
        
        const days = [];
        const currentDateStr = this.getDateKey(new Date());
        const selectedDateStr = this.getDateKey(this.selectedDate);
        
        for (let i = 0; i < 42; i++) {
            const currentDay = new Date(startDate);
            currentDay.setDate(startDate.getDate() + i);
            
            const dateKey = this.getDateKey(currentDay);
            const isCurrentMonth = currentDay.getMonth() === month;
            const isToday = dateKey === currentDateStr;
            const isSelected = dateKey === selectedDateStr;
            const hasEvents = this.events[dateKey] && this.events[dateKey].length > 0;
            
            let classes = 'calendar-day';
            if (!isCurrentMonth) classes += ' other-month';
            if (isToday) classes += ' today';
            if (isSelected) classes += ' selected';
            if (hasEvents) classes += ' has-events';
            
            days.push(`
                <div class="${classes}" onclick="calendarApp.selectDate('${dateKey}')">
                    <span class="day-number">${currentDay.getDate()}</span>
                    ${hasEvents ? '<div class="event-indicator"></div>' : ''}
                </div>
            `);
        }
        
        return days.join('');
    }

    // Select a specific date and refresh calendar display
    selectDate(dateKey) {
        const [year, month, day] = dateKey.split('-').map(Number);
        this.selectedDate = new Date(year, month - 1, day);
        this.renderCalendar();
    }

    // Navigate to previous month and refresh display
    previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.renderCalendar();
    }

    // Navigate to next month and refresh display
    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.renderCalendar();
    }

    // Navigate to previous day and refresh display
    previousDay() {
        this.selectedDate.setDate(this.selectedDate.getDate() - 1);
        this.renderCalendar();
    }

    // Navigate to next day and refresh display
    nextDay() {
        this.selectedDate.setDate(this.selectedDate.getDate() + 1);
        this.renderCalendar();
    }

    // Delete an event with finalization checks and user confirmation
    async deleteEvent(eventId) {
        try {
            const event = window.db.getEventById(eventId);
            
            // Check if this is a finalized game
            if (event && event.event_type === 'game') {
                const isFinalized = localStorage.getItem(`teamforge_game_finalized_${eventId}`) || event.is_finalized;
                
                if (isFinalized) {
                    this.showMessage('Cannot delete finalized games with stats data', 'error');
                    return;
                }
            }
            
            if (confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
                // Remove from database
                window.db.deleteEvent(eventId);
                
                // Close any open modals
                this.closeModal();
                
                // Reload events and refresh the display
                await this.loadUserData();
                this.renderCalendar();
                
                // Show success message
                this.showMessage('Event deleted successfully', 'success');
            }
        } catch (error) {
            console.error('Error deleting event:', error);
            this.showMessage('Failed to delete event', 'error');
        }
    }

    // Display temporary notification message to user
    showMessage(message, type = 'info') {
        // Create or update message display
        let messageEl = document.querySelector('.message-display');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.className = 'message-display';
            document.body.appendChild(messageEl);
        }
        
        messageEl.textContent = message;
        messageEl.className = `message-display ${type}`;
        messageEl.style.display = 'block';
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 3000);
    }

    // Open event editing modal with pre-populated data
    editEvent(eventId) {
        try {
            const event = window.db.getEventById(eventId);
            if (!event) {
                this.showMessage('Event not found', 'error');
                return;
            }

            // Create and show edit modal with pre-filled data
            const modal = this.createEventModal(event);
            document.body.appendChild(modal);
            this.showMessage('Edit the event details and click Save', 'info');
        } catch (error) {
            console.error('Error editing event:', error);
            this.showMessage('Failed to open edit form', 'error');
        }
    }

    // Navigate to stats management page for games
    manageGameStats(eventId) {
        try {
            const event = window.db.getEventById(eventId);
            if (!event || event.event_type !== 'game') {
                this.showMessage('Game not found', 'error');
                return;
            }

            // Check if game is finalized
            const isFinalized = localStorage.getItem(`teamforge_game_finalized_${eventId}`) || event.is_finalized;
            
            // For finalized games, redirect to game-stats.html which will handle role-based access
            if (isFinalized) {
                window.location.href = `game-stats.html?gameId=${eventId}`;
                return;
            }

            // Navigate to stats entry page for non-finalized games
            window.location.href = `stats-entry.html?gameId=${eventId}`;
        } catch (error) {
            console.error('Error navigating to stats:', error);
            this.showMessage('Failed to open stats page', 'error');
        }
    }

    // Navigate to game stats viewing page
    viewGameStats(eventId) {
        try {
            const event = window.db.getEventById(eventId);
            if (!event || event.event_type !== 'game') {
                this.showMessage('Game not found', 'error');
                return;
            }

            // Navigate to stats view page
            window.location.href = `game-stats.html?gameId=${eventId}`;
        } catch (error) {
            console.error('Error viewing stats:', error);
            this.showMessage('Failed to view stats', 'error');
        }
    }

    // Update player availability status for an event and refresh display
    setAvailability(eventId, status) {
        try {
            if (!this.currentUser?.id) {
                this.showMessage('Please log in to set availability', 'error');
                return;
            }

            // Update availability in database (correct parameter order: eventId, userId, status)
            window.db.setPlayerAvailability(eventId, this.currentUser.id, status);
            
            // Refresh the calendar to show updated status
            this.renderCalendar();
            
            const statusText = status === 'available' ? 'Available' : 
                             status === 'maybe' ? 'Maybe' : 'Unavailable';
            this.showMessage(`Availability set to: ${statusText}`, 'success');
        } catch (error) {
            console.error('Error setting availability:', error);
            this.showMessage('Failed to update availability', 'error');
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.calendarApp = new CalendarApp();
});
