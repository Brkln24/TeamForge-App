/**
 * File Name: notes.js
 * Purpose: Manages notes, messages between team members, unread message tracking, 
 *          and team-wide announcements with multi-team support.
 * Author: Brooklyn Ridley
 * Date Created: 12th August 2025
 * Last Modified: 25th August 2025
    */
console.log('notes.js file loaded');

class NotesApp {
    constructor() {
        this.db = null;
        this.currentUser = null;
        this.selectedMember = null;
        this.teamMembers = [];
        this.messages = [];
        this.currentTeam = null;
        this.unreadCounts = {}; // Track unread message counts per user
        
        this.init();
    }

    /**
     * PURPOSE: Initializes the notes application with database connection, authentication, and communication setup
     * 
     * INPUTS: None (uses global window.db and URL parameters)
     * 
     * OUTPUTS:
     * - Complete team communication interface loaded
     * - User authentication verified and team data loaded
     * - Unread message tracking enabled with periodic refresh
     * - URL parameter handling for direct user selection
     * 
     * JUSTIFICATION: This initialization method ensures proper application startup
     * with comprehensive error handling and graceful dependency loading. The periodic
     * refresh system provides real-time communication updates while URL parameter
     * handling enables seamless navigation from other application areas.
     * 
     * FUTURE ENHANCEMENTS:
     * - Add WebSocket support for real-time messaging
     * - Implement push notifications for new messages
     * - Add message encryption for enhanced privacy
     */
    async init() {
        try {
            console.log('NotesApp initializing...');
            
            // Wait for database to be ready
            await this.waitForDatabase();
            console.log('Database ready');
            
            // Check authentication
            this.currentUser = this.db.getCurrentUser();
            console.log('Current user:', this.currentUser);
            
            if (!this.currentUser) {
                console.log('No user found, redirecting to login');
                window.location.href = 'index.html';
                return;
            }

            // Load team data
            await this.loadTeamData();
            
            // Render the interface
            this.render();
            
            // Check for URL parameters to auto-select a user (from profile page reply)
            this.handleUrlParameters();
            
            // Set up periodic refresh for unread counts (every 10 seconds)
            this.setupPeriodicRefresh();
            
            console.log('NotesApp initialized successfully');
        } catch (error) {
            console.error('Error initializing NotesApp:', error);
            this.showError('Failed to load team communication');
        }
    }

    // Set up periodic refresh for unread message counts every 10 seconds
    setupPeriodicRefresh() {
        // Refresh unread counts every 10 seconds to catch new messages
        setInterval(() => {
            if (this.currentUser && this.teamMembers.length > 0) {
                const previousCounts = { ...this.unreadCounts };
                this.calculateUnreadCounts();
                
                // Only re-render if counts have changed
                const countsChanged = JSON.stringify(previousCounts) !== JSON.stringify(this.unreadCounts);
                if (countsChanged) {
                    console.log('Unread counts changed, updating UI');
                    this.render();
                }
            }
        }, 10000);
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
     * PURPOSE: Loads comprehensive team data from all teams user belongs to with duplicate handling
     * 
     * INPUTS: None (uses this.currentUser and database team memberships)
     * 
     * OUTPUTS:
     * - this.teamMembers: Unified list of all team members across user's teams
     * - this.currentTeam: Primary team for backward compatibility
     * - Duplicate member detection and multi-team tracking
     * - Unread message count calculation initiated
     * 
     * JUSTIFICATION: This method handles complex multi-team scenarios where users
     * may belong to multiple teams and need to communicate with members across
     * all teams. The duplicate detection ensures clean member lists while preserving
     * team association information for context.
     * 
     * FUTURE ENHANCEMENTS:
     * - Add team-specific message filtering
     * - Implement team switching interface
     * - Add bulk messaging capabilities for team announcements
     */
    async loadTeamData() {
        try {
            console.log('Loading team data...');
            
            // Get all teams the current user belongs to
            const userTeams = this.db.getUserTeams(this.currentUser.id) || [];
            console.log('User belongs to teams:', userTeams);
            
            if (userTeams.length === 0) {
                console.log('❌ User is not part of any team');
                this.teamMembers = [];
                return;
            }
            
            // Collect all team members from all teams the user belongs to
            const allTeamMembers = new Map(); // Use Map to avoid duplicates
            
            for (const userTeam of userTeams) {
                console.log(`Loading members for team: ${userTeam.name}`);
                const teamMembers = this.db.getTeamMembers(userTeam.id);
                console.log(`Team ${userTeam.name} members:`, teamMembers);
                
                // Add all team members except current user
                teamMembers
                    .filter(member => member.id !== this.currentUser.id)
                    .forEach(member => {
                        // Use member ID as key to avoid duplicates across teams
                        if (!allTeamMembers.has(member.id)) {
                            allTeamMembers.set(member.id, {
                                id: member.id,
                                name: `${member.first_name || member.firstName || ''} ${member.last_name || member.lastName || ''}`.trim(),
                                initials: this.getInitials(member.first_name || member.firstName, member.last_name || member.lastName),
                                role: this.formatRole(member.membership?.role || 'player'),
                                email: member.email || '',
                                teams: [userTeam.name] // Track which teams this member belongs to
                            });
                        } else {
                            // If member already exists, add this team to their teams list
                            const existingMember = allTeamMembers.get(member.id);
                            if (!existingMember.teams.includes(userTeam.name)) {
                                existingMember.teams.push(userTeam.name);
                            }
                        }
                    });
            }
            
            // Convert Map to array
            this.teamMembers = Array.from(allTeamMembers.values());
            
            // Set current team to the first team (for backward compatibility)
            this.currentTeam = userTeams[0];
            
            console.log('All team members loaded:', this.teamMembers);
            
            // Load messages if we have a selected member
            if (this.selectedMember) {
                this.loadMessages();
            }
            
            // Calculate unread message counts
            this.calculateUnreadCounts();
            
        } catch (error) {
            console.error('Error loading team data:', error);
            this.teamMembers = [];
        }
    }

    // Format user role names for display
    formatRole(role) {
        const roleNames = {
            'player': 'Player',
            'coach': 'Coach',
            'manager': 'Manager',
            'assistant_coach': 'Assistant Coach'
        };
        return roleNames[role] || role;
    }

    /**
     * PURPOSE: Calculates unread message counts for all team members with read status tracking
     * 
     * INPUTS: None (uses database notes and message_read_status tables)
     * 
     * OUTPUTS:
     * - this.unreadCounts: Object mapping member IDs to unread message counts
     * - Read status validation against message database
     * - Real-time unread indicator data for UI
     * 
     * JUSTIFICATION: Unread message tracking is essential for effective team
     * communication, helping users prioritize conversations and stay informed
     * about pending messages. The read status system ensures accurate tracking
     * across application sessions and prevents message loss.
     * 
     * FUTURE ENHANCEMENTS:
     * - Add message priority levels for important communications
     * - Implement message threading for organized conversations
     * - Add auto-read functionality for opened conversations
     */
    calculateUnreadCounts() {
        try {
            console.log('Calculating unread message counts...');
            this.unreadCounts = {};
            
            // Get all notes
            const allNotes = this.db.getTable('notes') || [];
            
            // Get read status table (track which messages have been read)
            let readStatus = this.db.getTable('message_read_status') || [];
            
            // For each team member, count unread messages from them to current user
            this.teamMembers.forEach(member => {
                const unreadMessages = allNotes.filter(note => {
                    // Messages from this member to current user
                    if (note.fromUserId !== member.id || note.toUserId !== this.currentUser.id) {
                        return false;
                    }
                    
                    // Check if this message has been marked as read
                    const isRead = readStatus.some(status => 
                        status.messageId === note.id && 
                        status.userId === this.currentUser.id
                    );
                    
                    return !isRead;
                });
                
                this.unreadCounts[member.id] = unreadMessages.length;
                console.log(`Unread count for ${member.name}: ${unreadMessages.length}`);
            });
            
        } catch (error) {
            console.error('Error calculating unread counts:', error);
            this.unreadCounts = {};
        }
    }

    // Load conversation messages between current user and selected member
    loadMessages() {
        try {
            if (!this.selectedMember) {
                this.messages = [];
                return;
            }
            
            console.log(`Loading messages between ${this.currentUser.id} and ${this.selectedMember.id}`);
            
            // Get all notes and filter for conversation between current user and selected member
            const allNotes = this.db.getTable('notes') || [];
            console.log('All notes in database:', allNotes);
            
            this.messages = allNotes
                .filter(note => {
                    // Messages between current user and selected member (both directions)
                    return (
                        (note.fromUserId === this.currentUser.id && note.toUserId === this.selectedMember.id) ||
                        (note.fromUserId === this.selectedMember.id && note.toUserId === this.currentUser.id)
                    );
                })
                .map(note => ({
                    id: note.id,
                    content: note.content,
                    fromUserId: note.fromUserId,
                    toUserId: note.toUserId,
                    timestamp: note.timestamp,
                    isFromCurrentUser: note.fromUserId === this.currentUser.id
                }))
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            
            console.log(`Loaded ${this.messages.length} messages for conversation:`, this.messages);
            
        } catch (error) {
            console.error('Error loading messages:', error);
            this.messages = [];
        }
    }

    /**
     * PURPOSE: Marks all messages from specific sender as read with persistent tracking
     * 
     * INPUTS: fromUserId (string representing the sender's user ID)
     * 
     * OUTPUTS:
     * - Messages marked as read in message_read_status table
     * - Unread counts updated for affected conversations
     * - Read status persisted for future application sessions
     * - UI indicators updated to reflect read status
     * 
     * JUSTIFICATION: Read status tracking is essential for professional team
     * communication, helping users manage their message workflow and ensuring
     * important communications are not overlooked. The persistent tracking
     * maintains accurate state across application restarts.
     * 
     * FUTURE ENHANCEMENTS:
     * - Add bulk mark-as-read functionality
     * - Implement read receipts for message senders
     * - Add configurable auto-read timeouts
     */
    markMessagesAsRead(fromUserId) {
        try {
            console.log(`Marking messages as read from user: ${fromUserId}`);
            
            // Get all notes from the selected member to current user
            const allNotes = this.db.getTable('notes') || [];
            const messagesToMarkRead = allNotes.filter(note => 
                note.fromUserId === fromUserId && note.toUserId === this.currentUser.id
            );
            
            // Get existing read status table
            let readStatus = this.db.getTable('message_read_status') || [];
            
            // Mark each message as read
            messagesToMarkRead.forEach(message => {
                // Check if already marked as read
                const alreadyRead = readStatus.some(status => 
                    status.messageId === message.id && 
                    status.userId === this.currentUser.id
                );
                
                if (!alreadyRead) {
                    readStatus.push({
                        id: this.generateId(),
                        messageId: message.id,
                        userId: this.currentUser.id,
                        readAt: new Date().toISOString()
                    });
                }
            });
            
            // Save updated read status
            this.db.setTable('message_read_status', readStatus);
            
            // Recalculate unread counts
            this.calculateUnreadCounts();
            
            console.log(`Marked ${messagesToMarkRead.length} messages as read`);
            
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    }

    // Generate user initials for avatar display
    getInitials(firstName, lastName) {
        const first = (firstName || 'U').charAt(0).toUpperCase();
        const last = (lastName || 'U').charAt(0).toUpperCase();
        return `${first}${last}`;
    }

    // Handle URL parameters for direct user selection from other pages
    handleUrlParameters() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const selectUserId = urlParams.get('selectUser');
            const userName = urlParams.get('userName');

            if (selectUserId) {
                // Find the user in team members
                const userToSelect = this.teamMembers.find(member => member.id === selectUserId);
                
                if (userToSelect) {
                    // Auto-select this member (pass the ID, not the object)
                    this.selectMember(userToSelect.id);
                    
                    // Clear URL parameters to avoid re-selection on refresh
                    const cleanUrl = window.location.pathname;
                    window.history.replaceState({}, document.title, cleanUrl);
                } else {
                    console.log('User not found in team members:', selectUserId);
                }
            }
        } catch (error) {
            console.error('Error handling URL parameters:', error);
        }
    }

    /**
     * PURPOSE: Renders complete team communication interface with member sidebar and chat area
     * 
     * INPUTS: None (uses this.teamMembers, this.selectedMember, and this.unreadCounts)
     * 
     * OUTPUTS:
     * - Complete HTML interface injected into notes-content container
     * - Member sidebar with unread indicators and role information
     * - Chat area with message history and input controls
     * - Responsive layout with empty state handling
     * 
     * JUSTIFICATION: This comprehensive rendering method provides an intuitive
     * communication interface similar to popular messaging applications. The
     * sidebar design enables quick member switching while the chat area focuses
     * on conversation flow and message clarity.
     * 
     * FUTURE ENHANCEMENTS:
     * - Add message search and filtering capabilities
     * - Implement message reactions and emoji support
     * - Add file attachment and media sharing features
     */
    render() {
        const container = document.getElementById('notes-content');
        
        if (this.teamMembers.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No Team Found</h3>
                    <p>You are not currently part of any team, or your team has no other members.</p>
                    <p>Contact your coach or team manager to be added to a team.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <!-- Team Members Sidebar -->
            <div class="team-members-sidebar">
                <div class="sidebar-header">
                    <h3 class="sidebar-title">Team Members</h3>
                </div>
                <div class="members-list">
                    ${this.teamMembers.map(member => {
                        const unreadCount = this.unreadCounts[member.id] || 0;
                        const roleDisplay = member.role;
                        const teamsDisplay = member.teams ? ` (${member.teams.join(', ')})` : '';
                        
                        return `
                            <div class="member-item ${this.selectedMember?.id === member.id ? 'active' : ''}" 
                                 onclick="notesApp.selectMember('${member.id}')">
                                <div class="member-avatar">${member.initials}</div>
                                <div class="member-info">
                                    <div class="member-name">${member.name}</div>
                                    <div class="member-role">${roleDisplay}${member.teams && member.teams.length > 1 ? teamsDisplay : ''}</div>
                                </div>
                                ${unreadCount > 0 ? `
                                    <div class="unread-indicator ${unreadCount > 9 ? 'has-count' : ''}">
                                        ${unreadCount > 9 ? '9+' : (unreadCount > 1 ? unreadCount : '')}
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            
            <!-- Chat Area -->
            <div class="chat-area">
                <div class="chat-header">
                    <div>
                        <h3 class="chat-title">
                            ${this.selectedMember ? this.selectedMember.name : 'Select a team member'}
                        </h3>
                        ${this.selectedMember ? `<div class="chat-subtitle">${this.selectedMember.role}${this.selectedMember.teams ? ` - ${this.selectedMember.teams.join(', ')}` : ''}</div>` : ''}
                    </div>
                </div>
                
                <div class="messages-container" id="messages-container">
                    ${this.renderMessages()}
                </div>
                
                <div class="message-input-area">
                    <input type="text" 
                           class="message-input" 
                           id="message-input"
                           placeholder="${this.selectedMember ? 'Type your message...' : 'Select a team member to start chatting'}"
                           ${!this.selectedMember ? 'disabled' : ''}
                           onkeypress="notesApp.handleKeyPress(event)">
                    <button class="send-button" 
                            onclick="notesApp.sendMessage()"
                            ${!this.selectedMember ? 'disabled' : ''}>
                        ➤
                    </button>
                </div>
            </div>
        `;
        
        // Scroll to bottom of messages
        setTimeout(() => this.scrollToBottom(), 100);
    }

    // Render message history for current conversation
    renderMessages() {
        if (!this.selectedMember) {
            return `
                <div class="empty-state">
                    <h3>Start a conversation</h3>
                    <p>Select a team member from the sidebar to start chatting.</p>
                </div>
            `;
        }
        
        if (this.messages.length === 0) {
            return `
                <div class="empty-state">
                    <h3>No messages yet</h3>
                    <p>Start the conversation with ${this.selectedMember.name}!</p>
                </div>
            `;
        }
        
        return this.messages.map(message => `
            <div class="message ${message.isFromCurrentUser ? 'sent' : 'received'}">
                ${this.escapeHtml(message.content)}
            </div>
        `).join('');
    }

    // Select team member for conversation and mark messages as read
    selectMember(memberId) {
        console.log('Selecting member:', memberId);
        
        this.selectedMember = this.teamMembers.find(member => member.id === memberId);
        console.log('Selected member:', this.selectedMember);
        
        // Mark messages from this member as read
        if (this.selectedMember) {
            this.markMessagesAsRead(this.selectedMember.id);
        }
        
        // Load messages for this member
        this.loadMessages();
        
        // Re-render to update the UI
        this.render();
    }

    /**
     * PURPOSE: Sends new message to selected team member with database persistence and UI updates
     * 
     * INPUTS: None (uses message-input element value and this.selectedMember)
     * 
     * OUTPUTS:
     * - New message saved to database notes table
     * - Message input cleared and interface updated
     * - Conversation history refreshed with new message
     * - Unread counts recalculated for real-time accuracy
     * 
     * JUSTIFICATION: The message sending functionality is core to team communication,
     * requiring robust error handling and immediate UI feedback. The method ensures
     * data persistence while providing responsive user experience through instant
     * interface updates and proper message ordering.
     * 
     * FUTURE ENHANCEMENTS:
     * - Add message delivery confirmations
     * - Implement draft message saving
     * - Add message editing and deletion capabilities
     */
    sendMessage() {
        const messageInput = document.getElementById('message-input');
        const content = messageInput.value.trim();
        
        if (!content || !this.selectedMember) {
            return;
        }
        
        try {
            console.log('Sending message:', content, 'to:', this.selectedMember.id);
            
            // Create new message
            const message = {
                id: this.generateId(),
                fromUserId: this.currentUser.id,
                toUserId: this.selectedMember.id,
                content: content,
                timestamp: new Date().toISOString()
            };
            
            // Add to database
            const notes = this.db.getTable('notes') || [];
            notes.push(message);
            this.db.setTable('notes', notes);
            
            console.log('Message saved to database');
            
            // Clear input
            messageInput.value = '';
            
            // Reload messages and recalculate unread counts
            this.loadMessages();
            this.calculateUnreadCounts();
            this.render();
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.showError('Failed to send message');
        }
    }

    // Handle Enter key press for message sending
    handleKeyPress(event) {
        if (event.key === 'Enter') {
            this.sendMessage();
        }
    }

    // Scroll messages container to bottom for latest messages
    scrollToBottom() {
        const messagesContainer = document.getElementById('messages-container');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    // Escape HTML characters for safe message display
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Generate unique ID for database records
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Display error messages with retry functionality
    showError(message) {
        console.error(message);
        const container = document.getElementById('notes-content');
        container.innerHTML = `
            <div class="empty-state">
                <h3>Error</h3>
                <p>${message}</p>
                <button onclick="window.location.reload()" 
                        style="background: var(--primary-color); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; margin-top: 1rem;">
                    Retry
                </button>
            </div>
        `;
    }

    // Debug function to create test unread messages (temporary)
    // Debug function to create test unread messages for development
    createTestUnreadMessages() {
        try {
            if (this.teamMembers.length === 0) {
                console.log('No team members to create test messages with');
                return;
            }

            const notes = this.db.getTable('notes') || [];
            const testMember = this.teamMembers[0];
            
            // Create a few test messages from the first team member to current user
            for (let i = 1; i <= 3; i++) {
                notes.push({
                    id: this.generateId(),
                    fromUserId: testMember.id,
                    toUserId: this.currentUser.id,
                    content: `Test unread message ${i} from ${testMember.name}`,
                    timestamp: new Date(Date.now() - (i * 60000)).toISOString() // Messages from 1-3 minutes ago
                });
            }
            
            this.db.setTable('notes', notes);
            console.log('Created test unread messages');
            
            // Recalculate and re-render
            this.calculateUnreadCounts();
            this.render();
            
        } catch (error) {
            console.error('Error creating test messages:', error);
        }
    }
}

// Initialize when DOM is loaded
let notesApp;
document.addEventListener('DOMContentLoaded', () => {
    console.log('Notes page DOM loaded, initializing app...');
    notesApp = new NotesApp();
    window.notesApp = notesApp;
});
