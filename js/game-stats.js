/**
 * File Name: game-stats.js
 * Purpose: Allows authorized users to record live game stats (points, rebounds, assists, steals, etc.) 
 *          with role-based access control and undo functionality.
 * Author: Brooklyn Ridley
 * Date Created: 27th July 2025
 * Last Modified: 25th August 2025
    */
class GameStatsApp {
    constructor() {
        this.selectedPlayer = null;
        this.selectedTeam = 'home';
        this.lastAction = null; // Store the last action for undo functionality
        this.gameId = null;
        this.gameEvent = null;
        this.homeTeam = null;
        this.awayTeam = null;
        this.entryLog = []; // Track all stat entries for the log
        this.gameData = {
            homeTeam: '',
            awayTeam: '',
            homeColor: '#3182ce',
            awayColor: '#722f37',
            homePlayers: [],
            awayPlayers: []
        };
        this.init();
    }

    /**
     * PURPOSE: Initializes the game statistics application with authentication, data loading, and UI setup
     * 
     * INPUTS: None (uses URL parameters and global window.db)
     * 
     * OUTPUTS: 
     * - Fully rendered game statistics interface
     * - Event listeners attached
     * - Player selection and stat entry ready
     * - Redirects to appropriate pages based on user permissions
     * 
     * JUSTIFICATION: This central initialization method ensures proper security checks,
     * data validation, and UI preparation before allowing stat entry. The role-based
     * access control prevents unauthorized users from modifying game statistics.
     * 
     * FUTURE ENHANCEMENTS:
     * - Add loading indicators during initialization
     * - Implement offline mode with data synchronization
     * - Add real-time collaboration features for multiple stat keepers
     */
    async init() {
        try {
            // Check authentication
            const currentUser = window.db?.getCurrentUser();
            if (!currentUser) {
                window.location.href = 'login.html';
                return;
            }

            // Get game ID from URL
            const urlParams = new URLSearchParams(window.location.search);
            this.gameId = urlParams.get('gameId');
            
            if (!this.gameId) {
                alert('No game specified');
                window.location.href = 'calendar.html';
                return;
            }

            // Check user role for this game
            await this.checkUserAccess();
            
            // Load game and team data
            await this.loadGameData();
            this.renderGameStats();
            this.setupEventListeners();
            this.attachPlayerClickListeners();
        } catch (error) {
            console.error('Error initializing game stats:', error);
            alert('Error loading game data');
        }
    }

    /**
     * PURPOSE: Validates user permissions and redirects based on role and game status
     * 
     * INPUTS: None (uses this.gameId and current user from global state)
     * 
     * OUTPUTS:
     * - Redirects players to read-only statistics view
     * - Redirects coaches/managers to appropriate interface based on game finalization
     * - Allows stat entry only for authorized coaches/managers on unfinalized games
     * 
     * JUSTIFICATION: Security is critical in sports statistics as data integrity affects
     * team analysis and player evaluation. Role-based access ensures only authorized
     * personnel can modify statistics while maintaining transparency for all team members.
     * 
     * FUTURE ENHANCEMENTS:
     * - Add audit logging for access attempts
     * - Implement temporary stat entry permissions
     * - Add approval workflow for controversial stat entries
     */
    async checkUserAccess() {
        const currentUser = window.db?.getCurrentUser();
        if (!currentUser) return;

        // Get the game event to check team ownership
        const gameEvent = window.db.getEventById(this.gameId);
        if (!gameEvent) {
            throw new Error('Game not found');
        }

        // Check if game is finalized
        const isFinalized = localStorage.getItem(`teamforge_game_finalized_${this.gameId}`) || gameEvent.is_finalized;
        
        // Check if game is confirmed (required for stats entry)
        const isConfirmed = gameEvent.is_confirmed !== false; // Default to true for legacy games
        
        if (!isConfirmed) {
            alert('This game has not been confirmed by the opponent team yet. Stats entry is not available.');
            window.location.href = 'calendar.html';
            return;
        }

        // Get user's role in the home team (game creator's team)
        const homeTeam = window.db.getTeamById(gameEvent.team_id);
        if (!homeTeam) {
            throw new Error('Home team not found');
        }

        const userRole = window.db.getUserTeamRole(currentUser.id, gameEvent.team_id);
        console.log('User role in team:', userRole);
        console.log('Game finalized:', isFinalized);
        console.log('Game confirmed:', isConfirmed);

        // For players: always redirect to read-only mode
        if (userRole === 'player') {
            window.location.href = `stats-entry.html?gameId=${this.gameId}&readOnly=true`;
            return;
        }

        // For coaches/managers: 
        // - If game is finalized, show read-only view
        // - If game is not finalized, show full editing interface
        if (userRole === 'coach' || userRole === 'manager') {
            if (isFinalized) {
                window.location.href = `stats-entry.html?gameId=${this.gameId}&readOnly=true`;
            } else {
                window.location.href = `stats-entry.html?gameId=${this.gameId}`;
            }
            return;
        }

        // If no specific role found, treat as read-only
        window.location.href = `stats-entry.html?gameId=${this.gameId}&readOnly=true`;
    }

    /**
     * PURPOSE: Loads comprehensive game data including teams, players, and existing statistics
     * 
     * INPUTS: None (uses this.gameId from URL parameters)
     * 
     * OUTPUTS:
     * - this.gameEvent: Complete game event details
     * - this.homeTeam, this.awayTeam: Team objects with metadata
     * - this.gameData: Structured player data with current statistics
     * - Player selection initialization
     * 
     * JUSTIFICATION: Centralizing data loading ensures consistency across the interface
     * and provides a single point for handling data integrity issues. The method handles
     * both team-vs-team games and games against external opponents gracefully.
     * 
     * FUTURE ENHANCEMENTS:
     * - Add data validation and error recovery
     * - Implement caching for better performance
     * - Add support for tournament brackets and playoff games
     */
    async loadGameData() {
        // Get game event
        this.gameEvent = window.db.getEventById(this.gameId);
        if (!this.gameEvent) {
            throw new Error('Game not found');
        }

        // Get home team (the team that created the event)
        this.homeTeam = window.db.getTeamById(this.gameEvent.team_id);
        
        // Get opponent team from game description/title or opponent_team_id field
        // For now, we'll parse from the event title or add opponent_team_id to events
        this.awayTeam = this.parseOpponentFromEvent(this.gameEvent);
        
        console.log('=== TEAM ASSIGNMENT DEBUG ==='); // Debug log
        console.log('Game Event:', this.gameEvent); // Debug log
        console.log('Home Team ID:', this.homeTeam ? this.homeTeam.id : 'NULL'); // Debug log
        console.log('Home Team Name:', this.homeTeam ? this.homeTeam.name : 'NULL'); // Debug log
        console.log('Away Team ID:', this.awayTeam ? this.awayTeam.id : 'NULL'); // Debug log
        console.log('Away Team Name:', this.awayTeam ? this.awayTeam.name : 'NULL'); // Debug log
        console.log('Teams are different?', this.homeTeam && this.awayTeam ? (this.homeTeam.id !== this.awayTeam.id) : 'Cannot compare - missing team'); // Debug log
        console.log('=== END TEAM ASSIGNMENT DEBUG ==='); // Debug log
        
        // Load players
        this.gameData.homeTeam = this.homeTeam.name;
        this.gameData.awayTeam = this.awayTeam ? this.awayTeam.name : 'Opponent';
        this.gameData.homePlayers = this.loadTeamPlayers(this.homeTeam.id, 'home');
        this.gameData.awayPlayers = this.awayTeam ? this.loadTeamPlayers(this.awayTeam.id, 'away') : [];

        // Load existing game stats if any
        this.loadExistingGameStats();

        // Set first player as selected
        if (this.gameData.homePlayers.length > 0) {
            this.gameData.homePlayers[0].selected = true;
            this.selectedPlayer = this.gameData.homePlayers[0];
        }
    }

    // Parse opponent team information from event title or opponent_team_id field
    parseOpponentFromEvent(event) {
        // Look for opponent_team_id field first
        if (event.opponent_team_id) {
            return window.db.getTeamById(event.opponent_team_id);
        }
        
        // Parse from title - look for "vs" pattern
        const vsMatch = event.title.match(/vs\s+(.+)$/i);
        if (vsMatch) {
            const opponentName = vsMatch[1].trim();
            // Try to find team by name
            const teams = window.db.getTable('teams') || [];
            return teams.find(team => team.name.toLowerCase() === opponentName.toLowerCase());
        }
        
        return null;
    }

    // Load and map team players with initialized statistics structure
    loadTeamPlayers(teamId, teamType) {
        const players = window.db.getTeamPlayers(teamId);
        console.log('loadTeamPlayers called for team:', teamId, 'type:', teamType, 'raw players:', players); // Debug log
        
        const mappedPlayers = players.map((player, index) => {
            const mappedPlayer = {
                id: player.id, // This should be the user ID from the database
                name: `${player.first_name} ${player.last_name}`,
                number: player.jersey_number || (index + 1),
                pts: 0,
                ast: 0,
                reb: 0,
                stl: 0,
                to: 0,
                blk: 0,
                fgm: 0,
                fga: 0,
                ftm: 0,
                fta: 0,
                tpm: 0,
                tpa: 0,
                min: 0,
                fouls: 0,
                selected: false,
                teamType: teamType
            };
            console.log('Mapped player:', mappedPlayer); // Debug log
            return mappedPlayer;
        });
        
        console.log('Final mapped players for team:', mappedPlayers); // Debug log
        return mappedPlayers;
    }

    // Retrieve and apply existing game statistics to player objects
    loadExistingGameStats() {
        const existingStats = window.db.getGameStats(this.gameId);
        console.log('Loading existing stats for game:', this.gameId, existingStats); // Debug log
        console.log('Home players:', this.gameData.homePlayers.map(p => ({id: p.id, name: p.name}))); // Debug log
        console.log('Away players:', this.gameData.awayPlayers.map(p => ({id: p.id, name: p.name}))); // Debug log
        
        existingStats.forEach(stat => {
            // Find player and update their stats
            const homePlayer = this.gameData.homePlayers.find(p => p.id === stat.player_id);
            const awayPlayer = this.gameData.awayPlayers.find(p => p.id === stat.player_id);
            const player = homePlayer || awayPlayer;
            
            console.log('Looking for player ID:', stat.player_id, 'Found player:', player ? player.name : 'NOT FOUND'); // Debug log
            
            if (player) {
                console.log('Updating player stats for:', player.name, stat); // Debug log
                player.pts = stat.points || 0;
                player.ast = stat.assists || 0;
                player.reb = stat.rebounds || 0;
                player.stl = stat.steals || 0;
                player.to = stat.turnovers || 0;
                player.blk = stat.blocks || 0;
                player.fgm = stat.fg_made || 0;
                player.fga = stat.fg_attempted || 0;
                player.ftm = stat.ft_made || 0;
                player.fta = stat.ft_attempted || 0;
                player.tpm = stat.three_made || 0;
                player.tpa = stat.three_attempted || 0;
                player.min = stat.minutes || 0;
                player.fouls = stat.fouls || 0;
                console.log('Player stats updated:', player); // Debug log
            } else {
                console.log('Player not found for stat:', stat); // Debug log
                console.log('Available player IDs:', [
                    ...this.gameData.homePlayers.map(p => p.id),
                    ...this.gameData.awayPlayers.map(p => p.id)
                ]); // Debug log
            }
        });
        
        console.log('Final player data after loading stats:', this.gameData); // Debug log
    }

    /**
     * PURPOSE: Renders the complete game statistics interface with teams, players, and controls
     * 
     * INPUTS: None (uses this.gameData and this.selectedPlayer state)
     * 
     * OUTPUTS:
     * - Complete HTML interface injected into game-stats-content
     * - Team rosters with current statistics displayed
     * - Stat entry controls and number pad
     * - Navigation and action buttons
     * 
     * JUSTIFICATION: This comprehensive rendering method ensures consistent UI state
     * and provides an intuitive interface for rapid stat entry during live games.
     * The layout is optimized for touch devices and quick data entry workflows.
     * 
     * FUTURE ENHANCEMENTS:
     * - Add responsive breakpoints for tablet optimization
     * - Implement customizable stat categories
     * - Add visual indicators for player performance trends
     */
    renderGameStats() {
        const container = document.getElementById('game-stats-content');
        container.innerHTML = `
            <div class="game-stats-layout">
                <!-- Game Header -->
                <div class="game-header">
                    <div class="team-info home-team">
                        <div class="team-logo"><i class="bi bi-trophy-fill"></i></div>
                        <h2>${this.gameData.homeTeam}</h2>
                    </div>
                    <div class="vs-indicator">vs</div>
                    <div class="team-info away-team">
                        <h2>${this.gameData.awayTeam}</h2>
                        <div class="team-logo"><i class="bi bi-trophy-fill"></i></div>
                    </div>
                </div>

                <!-- Game Actions -->
                <div class="game-actions">
                    <button class="action-btn" onclick="gameStatsApp.showEntryLog()"><i class="bi bi-list-ul"></i> Entry Log</button>
                    <button class="action-btn" onclick="gameStatsApp.confirmGame()">✅ Confirm Game</button>
                    <button class="action-btn" onclick="gameStatsApp.saveGame()">💾 Save</button>
                </div>

                <!-- Main Stats Interface -->
                <div class="stats-interface">
                    <!-- Home Team Roster -->
                    <div class="team-roster home-roster">
                        <h3>${this.gameData.homeTeam}</h3>
                        <div class="player-list">
                            ${this.renderPlayerList(this.gameData.homePlayers, 'home')}
                        </div>
                    </div>

                    <!-- Stat Entry Panel -->
                    <div class="stat-entry-panel">
                        <div class="selected-player-info">
                            <div class="player-name">${this.selectedPlayer ? this.selectedPlayer.name : 'Select Player'}</div>
                            <div class="player-number">#${this.selectedPlayer ? this.selectedPlayer.number : '--'}</div>
                        </div>

                        <!-- Number Pad for Points -->
                        <div class="number-pad">
                            <button class="num-btn" data-pts="1">1PT</button>
                            <button class="num-btn" data-pts="2">2PT</button>
                            <button class="num-btn" data-pts="3">3PT</button>
                        </div>

                        <!-- Stat Buttons -->
                        <div class="stat-buttons">
                            <div class="stat-row">
                                <button class="stat-btn" data-stat="ast">AST</button>
                                <button class="stat-btn" data-stat="reb">REB</button>
                                <button class="stat-btn" data-stat="stl">STL</button>
                            </div>
                            <div class="stat-row">
                                <button class="stat-btn" data-stat="blk">BLK</button>
                                <button class="stat-btn" data-stat="to">TO</button>
                                <button class="stat-btn" data-stat="fouls">FOUL</button>
                            </div>
                        </div>

                        <!-- Advanced Stats -->
                        <div class="advanced-stats">
                            <div class="stat-row">
                                <button class="stat-btn small" data-stat="fgm">FGM</button>
                                <button class="stat-btn small" data-stat="fga">FGA</button>
                                <button class="stat-btn small" data-stat="ftm">FTM</button>
                                <button class="stat-btn small" data-stat="fta">FTA</button>
                            </div>
                            <div class="stat-row">
                                <button class="stat-btn small" data-stat="tpm">3PM</button>
                                <button class="stat-btn small" data-stat="tpa">3PA</button>
                                <button class="stat-btn small" data-stat="min">MIN</button>
                            </div>
                        </div>

                        <!-- Undo Button -->
                        <button class="undo-btn" ${this.lastAction ? '' : 'disabled'} onclick="gameStatsApp.undoLastAction()">↶ Undo</button>

                        <!-- Quick Actions Info -->
                        <div class="quick-actions-info">
                            <div class="info-text">Quick Actions:</div>
                            <div class="info-detail">• Click number buttons for points</div>
                            <div class="info-detail">• Click stat buttons to add +1</div>
                            <div class="info-detail">• Use keyboard: 1, 2, 3 for points</div>
                        </div>
                    </div>

                    <!-- Away Team Roster -->
                    <div class="team-roster away-roster">
                        <h3>${this.gameData.awayTeam}</h3>
                        <div class="player-list">
                            ${this.renderPlayerList(this.gameData.awayPlayers, 'away')}
                        </div>
                    </div>
                </div>

                <!-- Navigation Arrows -->
                <div class="nav-arrows">
                    <button class="nav-arrow left-arrow" onclick="gameStatsApp.previousPlayer()">←</button>
                    <button class="nav-arrow right-arrow" onclick="gameStatsApp.nextPlayer()">→</button>
                </div>
            </div>
        `;
    }

    // Generate HTML for team player roster with current statistics
    renderPlayerList(players, team) {
        return players.map(player => `
            <div class="stats-player-row ${player.selected ? 'selected' : ''}" 
                 onclick="gameStatsApp.selectPlayer(${player.id}, '${team}')">
                <div class="stats-player-info">
                    <div class="stats-player-avatar">${player.name.split(' ').map(n => n[0]).join('')}</div>
                    <div class="stats-player-details">
                        <div class="stats-player-name">${player.name}</div>
                        <div class="stats-player-number">#${player.number}</div>
                    </div>
                </div>
                <div class="stats-player-stats">
                    <div class="stats-stat-display">
                        <span class="stats-stat-label">PTS</span>
                        <span class="stats-stat-value">${player.pts}</span>
                    </div>
                    <div class="stats-stat-display">
                        <span class="stats-stat-label">AST</span>
                        <span class="stats-stat-value">${player.ast}</span>
                    </div>
                    <div class="stats-stat-display">
                        <span class="stats-stat-label">REB</span>
                        <span class="stats-stat-value">${player.reb}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * PURPOSE: Configures all event listeners for stat entry, navigation, and keyboard shortcuts
     * 
     * INPUTS: None (attaches to DOM elements created by renderGameStats)
     * 
     * OUTPUTS:
     * - Click handlers for point buttons (1PT, 2PT, 3PT)
     * - Click handlers for statistic buttons (AST, REB, STL, etc.)
     * - Keyboard shortcuts for rapid entry (1, 2, 3 keys)
     * - Undo functionality with Ctrl+Z support
     * 
     * JUSTIFICATION: Event delegation and keyboard shortcuts are essential for efficient
     * stat entry during fast-paced games. The undo functionality prevents errors that
     * could compromise game data integrity and analysis accuracy.
     * 
     * FUTURE ENHANCEMENTS:
     * - Add configurable keyboard shortcuts
     * - Implement gesture controls for touch devices
     * - Add voice recognition for hands-free stat entry
     */
    setupEventListeners() {
        // Points buttons (1, 2, 3 points)
        document.querySelectorAll('.num-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const points = parseInt(btn.dataset.pts);
                if (this.selectedPlayer) {
                    this.recordAction('pts', points, this.selectedPlayer);
                    this.selectedPlayer.pts += points;
                    this.updatePlayerDisplay();
                }
            });
        });

        // Stat buttons (add 1 of each stat)
        document.querySelectorAll('.stat-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const stat = btn.dataset.stat;
                if (this.selectedPlayer && this.selectedPlayer.hasOwnProperty(stat)) {
                    this.recordAction(stat, 1, this.selectedPlayer);
                    this.selectedPlayer[stat] += 1;
                    this.updatePlayerDisplay();
                }
            });
        });

        // Undo button
        const undoBtn = document.querySelector('.undo-btn');
        if (undoBtn) {
            undoBtn.addEventListener('click', () => {
                this.undoLastAction();
            });
        }

        // Keyboard listeners
        document.addEventListener('keydown', (e) => {
            if (this.selectedPlayer) {
                if (e.key === '1') {
                    this.recordAction('pts', 1, this.selectedPlayer);
                    this.selectedPlayer.pts += 1;
                    this.updatePlayerDisplay();
                } else if (e.key === '2') {
                    this.recordAction('pts', 2, this.selectedPlayer);
                    this.selectedPlayer.pts += 2;
                    this.updatePlayerDisplay();
                } else if (e.key === '3') {
                    this.recordAction('pts', 3, this.selectedPlayer);
                    this.selectedPlayer.pts += 3;
                    this.updatePlayerDisplay();
                } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    this.undoLastAction();
                }
            }
        });
    }

    // Update player display and re-attach event listeners after stat changes
    updatePlayerDisplay() {
        // Update the selected player info panel
        const playerNameEl = document.querySelector('.selected-player-info .player-name');
        const playerNumberEl = document.querySelector('.selected-player-info .player-number');
        if (playerNameEl && this.selectedPlayer) {
            playerNameEl.textContent = this.selectedPlayer.name;
        }
        if (playerNumberEl && this.selectedPlayer) {
            playerNumberEl.textContent = `#${this.selectedPlayer.number}`;
        }

        // Update the specific player row in the roster
        const homePlayerList = document.querySelector('.home-roster .player-list');
        const awayPlayerList = document.querySelector('.away-roster .player-list');
        
        if (homePlayerList) {
            homePlayerList.innerHTML = this.renderPlayerList(this.gameData.homePlayers, 'home');
        }
        if (awayPlayerList) {
            awayPlayerList.innerHTML = this.renderPlayerList(this.gameData.awayPlayers, 'away');
        }

        // Re-attach event listeners for player selection
        this.attachPlayerClickListeners();

        // Update undo button state
        const undoBtn = document.querySelector('.undo-btn');
        if (undoBtn) {
            undoBtn.disabled = !this.lastAction;
        }
    }

    // Attach click event listeners to player rows for selection
    attachPlayerClickListeners() {
        document.querySelectorAll('.stats-player-row').forEach(row => {
            const onclickAttr = row.getAttribute('onclick');
            if (onclickAttr) {
                row.removeAttribute('onclick');
                const match = onclickAttr.match(/selectPlayer\((\d+), '(\w+)'\)/);
                if (match) {
                    const playerId = parseInt(match[1]);
                    const team = match[2];
                    row.addEventListener('click', () => {
                        this.selectPlayer(playerId, team);
                    });
                }
            }
        });
    }

    // Select a player for stat entry and update UI state
    selectPlayer(playerId, team) {
        // Clear previous selections
        this.gameData.homePlayers.forEach(p => p.selected = false);
        this.gameData.awayPlayers.forEach(p => p.selected = false);

        // Find and select the new player
        const allPlayers = [...this.gameData.homePlayers, ...this.gameData.awayPlayers];
        const player = allPlayers.find(p => p.id === playerId);
        
        if (player) {
            player.selected = true;
            this.selectedPlayer = player;
            this.selectedTeam = team;
            this.renderGameStats();
            this.setupEventListeners();
        }
    }

    // Clear temporary entry data (placeholder method for future functionality)
    clearEntry() {
        // Method to clear any temporary entry data if needed
        // Currently not needed but prevents errors
    }

    // Navigate to previous player in current team roster
    previousPlayer() {
        const currentTeam = this.selectedTeam === 'home' ? this.gameData.homePlayers : this.gameData.awayPlayers;
        const currentIndex = currentTeam.findIndex(p => p.selected);
        
        if (currentIndex > 0) {
            this.selectPlayer(currentTeam[currentIndex - 1].id, this.selectedTeam);
        }
    }

    // Navigate to next player in current team roster
    nextPlayer() {
        const currentTeam = this.selectedTeam === 'home' ? this.gameData.homePlayers : this.gameData.awayPlayers;
        const currentIndex = currentTeam.findIndex(p => p.selected);
        
        if (currentIndex < currentTeam.length - 1) {
            this.selectPlayer(currentTeam[currentIndex + 1].id, this.selectedTeam);
        }
    }

    // Record a statistical action for undo functionality and entry logging
    recordAction(statType, value, player) {
        this.lastAction = {
            statType: statType,
            value: value,
            player: player,
            timestamp: Date.now()
        };

        // Add to entry log
        const entry = {
            id: Date.now(),
            playerId: player.id,
            playerName: player.name,
            statType: statType,
            value: value,
            timestamp: Date.now(),
            time: new Date().toLocaleTimeString()
        };
        this.entryLog.push(entry);
    }

    // Reverse the last statistical entry for error correction
    undoLastAction() {
        if (this.lastAction && this.lastAction.player) {
            const { statType, value, player } = this.lastAction;
            
            // Subtract the value from the player's stat
            if (player.hasOwnProperty(statType)) {
                player[statType] = Math.max(0, player[statType] - value);
            }
            
            // Remove from entry log
            this.entryLog = this.entryLog.filter(entry => entry.timestamp !== this.lastAction.timestamp);
            
            // Clear the last action
            this.lastAction = null;
            
            // Re-render to show updated stats
            this.updatePlayerDisplay();
        }
    }

    // Database Integration Methods
    /**
     * PURPOSE: Persists individual and team statistics to database with comprehensive data integrity
     * 
     * INPUTS: None (uses current player statistics from this.gameData)
     * 
     * OUTPUTS:
     * - Individual player stats saved to game_stats table
     * - Team aggregated statistics updated
     * - Season totals recalculated for all players
     * - Success/error feedback to user
     * 
     * JUSTIFICATION: This method ensures data consistency across individual, team, and
     * season statistics while handling complex scenarios like inter-team games and
     * external opponents. Proper error handling prevents data corruption during saves.
     * 
     * FUTURE ENHANCEMENTS:
     * - Add automatic backup before save operations
     * - Implement conflict resolution for concurrent edits
     * - Add export functionality for external analytics tools
     */
    saveGame() {
        try {
            const allPlayers = [...this.gameData.homePlayers, ...this.gameData.awayPlayers];
            const gameStats = [];
            const homeTeamStats = {
                points: 0, assists: 0, rebounds: 0, steals: 0, turnovers: 0, blocks: 0,
                fg_made: 0, fg_attempted: 0, ft_made: 0, ft_attempted: 0,
                three_made: 0, three_attempted: 0, minutes: 0, fouls: 0, players_with_stats: 0
            };
            const awayTeamStats = {
                points: 0, assists: 0, rebounds: 0, steals: 0, turnovers: 0, blocks: 0,
                fg_made: 0, fg_attempted: 0, ft_made: 0, ft_attempted: 0,
                three_made: 0, three_attempted: 0, minutes: 0, fouls: 0, players_with_stats: 0
            };

            console.log('=== SAVE GAME DEBUG ===');
            console.log('Home Team ID:', this.homeTeam?.id);
            console.log('Away Team ID:', this.awayTeam?.id);
            console.log('All Players:', allPlayers.map(p => ({name: p.name, id: p.id, teamType: p.teamType})));
            console.log('Home Players Array:', this.gameData.homePlayers.map(p => ({name: p.name, id: p.id, pts: p.pts})));
            console.log('Away Players Array:', this.gameData.awayPlayers.map(p => ({name: p.name, id: p.id, pts: p.pts})));
            
            // CRITICAL CHECK: Are we missing away team?
            if (!this.awayTeam) {
                console.error('🚨 CRITICAL ISSUE: No away team found! All players will be assigned to home team.');
                alert('⚠️ No away team detected! This will cause all stats to be assigned to the home team. Please ensure the game has an opponent_team_id set.');
            }

            // Process each player and save individual stats
            allPlayers.forEach(player => {
                // NEW LOGIC: Use roster position instead of team membership
                // This determines which SIDE they're playing on in THIS game
                const isPlayingForHome = this.gameData.homePlayers.includes(player);
                const isPlayingForAway = this.gameData.awayPlayers.includes(player);
                
                console.log(`Player ${player.name}: playing_for_home=${isPlayingForHome}, playing_for_away=${isPlayingForAway}, teamType=${player.teamType}`);
                
                // Determine correct team_id for database storage based on which roster they're on
                let assignedTeamId;
                if (isPlayingForHome) {
                    assignedTeamId = this.homeTeam?.id;
                } else if (isPlayingForAway) {
                    assignedTeamId = this.awayTeam?.id;
                } else {
                    // Fallback: use the teamType
                    assignedTeamId = player.teamType === 'home' ? this.homeTeam?.id : this.awayTeam?.id;
                    console.warn(`⚠️ Could not determine roster position for player ${player.name}, using teamType fallback`);
                }
                
                // Always save individual player stats
                const playerStats = {
                    player_id: player.id,
                    team_id: assignedTeamId,
                    points: player.pts,
                    assists: player.ast,
                    rebounds: player.reb,
                    steals: player.stl,
                    turnovers: player.to,
                    blocks: player.blk,
                    fg_made: player.fgm,
                    fg_attempted: player.fga,
                    ft_made: player.ftm,
                    ft_attempted: player.fta,
                    three_made: player.tpm,
                    three_attempted: player.tpa,
                    minutes: player.min,
                    fouls: player.fouls
                };
                
                console.log(`✅ Player ${player.name} assigned to team_id: ${assignedTeamId} (${isPlayingForHome ? 'HOME' : 'AWAY'} roster)`);
                gameStats.push(playerStats);

                // Accumulate team stats based on ROSTER POSITION, not team membership
                if (isPlayingForHome) {
                    this.addToTeamStats(homeTeamStats, player);
                    console.log(`➕ Added ${player.name} stats to HOME team totals (from home roster)`);
                } else if (isPlayingForAway) {
                    this.addToTeamStats(awayTeamStats, player);
                    console.log(`➕ Added ${player.name} stats to AWAY team totals (from away roster)`);
                } else {
                    console.warn(`⚠️ Player ${player.name} not found in either roster - this shouldn't happen!`);
                }
            });

            console.log('Final home team stats:', homeTeamStats);
            console.log('Final away team stats:', awayTeamStats);
            console.log('Individual game stats with team assignments:', gameStats.map(gs => ({
                player_id: gs.player_id,
                team_id: gs.team_id,
                points: gs.points
            })));
            console.log('=== END SAVE GAME DEBUG ===');

            // Save individual player stats to database
            window.db.saveGameStats(this.gameId, gameStats);
            
            // Save team stats to database
            this.saveTeamStats(homeTeamStats, awayTeamStats);
            
            // Update season totals
            this.updateSeasonTotals(gameStats);
            
            alert('Game stats saved successfully!');
        } catch (error) {
            console.error('Error saving game stats:', error);
            alert('Error saving game stats');
        }
    }

    // Add player stats to team totals
    // Add individual player statistics to team aggregate totals
    addToTeamStats(teamStats, player) {
        teamStats.points += player.pts;
        teamStats.assists += player.ast;
        teamStats.rebounds += player.reb;
        teamStats.steals += player.stl;
        teamStats.turnovers += player.to;
        teamStats.blocks += player.blk;
        teamStats.fg_made += player.fgm;
        teamStats.fg_attempted += player.fga;
        teamStats.ft_made += player.ftm;
        teamStats.ft_attempted += player.fta;
        teamStats.three_made += player.tpm;
        teamStats.three_attempted += player.tpa;
        teamStats.minutes += player.min;
        teamStats.fouls += player.fouls;
        
        if (this.hasStats(player)) {
            teamStats.players_with_stats++;
        }
    }

    // Save aggregated team statistics to season totals database
    saveTeamStats(homeTeamStats, awayTeamStats) {
        try {
            console.log('=== SAVING TEAM STATS TO NEW SYSTEM ==='); // Enhanced debug
            console.log('Home Team Object:', this.homeTeam); // Debug log
            console.log('Away Team Object:', this.awayTeam); // Debug log
            console.log('Home Team Stats to Save:', homeTeamStats); // Debug log
            console.log('Away Team Stats to Save:', awayTeamStats); // Debug log
            
            // Update home team season stats
            if (this.homeTeam) {
                console.log('🏠 Updating HOME team season stats for:', this.homeTeam.name);
                window.db.updateTeamSeasonStats(this.homeTeam.id, {
                    games_played: (window.db.getTeamSeasonStats(this.homeTeam.id)?.games_played || 0) + 1,
                    total_points: (window.db.getTeamSeasonStats(this.homeTeam.id)?.total_points || 0) + homeTeamStats.points,
                    total_assists: (window.db.getTeamSeasonStats(this.homeTeam.id)?.total_assists || 0) + homeTeamStats.assists,
                    total_rebounds: (window.db.getTeamSeasonStats(this.homeTeam.id)?.total_rebounds || 0) + homeTeamStats.rebounds,
                    total_steals: (window.db.getTeamSeasonStats(this.homeTeam.id)?.total_steals || 0) + homeTeamStats.steals,
                    total_blocks: (window.db.getTeamSeasonStats(this.homeTeam.id)?.total_blocks || 0) + homeTeamStats.blocks,
                    total_turnovers: (window.db.getTeamSeasonStats(this.homeTeam.id)?.total_turnovers || 0) + homeTeamStats.turnovers,
                    total_fouls: (window.db.getTeamSeasonStats(this.homeTeam.id)?.total_fouls || 0) + homeTeamStats.fouls,
                    total_fg_made: (window.db.getTeamSeasonStats(this.homeTeam.id)?.total_fg_made || 0) + homeTeamStats.fg_made,
                    total_fg_attempted: (window.db.getTeamSeasonStats(this.homeTeam.id)?.total_fg_attempted || 0) + homeTeamStats.fg_attempted,
                    total_ft_made: (window.db.getTeamSeasonStats(this.homeTeam.id)?.total_ft_made || 0) + homeTeamStats.ft_made,
                    total_ft_attempted: (window.db.getTeamSeasonStats(this.homeTeam.id)?.total_ft_attempted || 0) + homeTeamStats.ft_attempted,
                    total_three_made: (window.db.getTeamSeasonStats(this.homeTeam.id)?.total_three_made || 0) + homeTeamStats.three_made,
                    total_three_attempted: (window.db.getTeamSeasonStats(this.homeTeam.id)?.total_three_attempted || 0) + homeTeamStats.three_attempted,
                    total_minutes: (window.db.getTeamSeasonStats(this.homeTeam.id)?.total_minutes || 0) + homeTeamStats.minutes
                });
                console.log('✅ HOME team season stats updated');
            } else {
                console.log('❌ No home team to save stats for'); // Debug log
            }

            // Update away team season stats
            if (this.awayTeam) {
                console.log('🏃 Updating AWAY team season stats for:', this.awayTeam.name);
                window.db.updateTeamSeasonStats(this.awayTeam.id, {
                    games_played: (window.db.getTeamSeasonStats(this.awayTeam.id)?.games_played || 0) + 1,
                    total_points: (window.db.getTeamSeasonStats(this.awayTeam.id)?.total_points || 0) + awayTeamStats.points,
                    total_assists: (window.db.getTeamSeasonStats(this.awayTeam.id)?.total_assists || 0) + awayTeamStats.assists,
                    total_rebounds: (window.db.getTeamSeasonStats(this.awayTeam.id)?.total_rebounds || 0) + awayTeamStats.rebounds,
                    total_steals: (window.db.getTeamSeasonStats(this.awayTeam.id)?.total_steals || 0) + awayTeamStats.steals,
                    total_blocks: (window.db.getTeamSeasonStats(this.awayTeam.id)?.total_blocks || 0) + awayTeamStats.blocks,
                    total_turnovers: (window.db.getTeamSeasonStats(this.awayTeam.id)?.total_turnovers || 0) + awayTeamStats.turnovers,
                    total_fouls: (window.db.getTeamSeasonStats(this.awayTeam.id)?.total_fouls || 0) + awayTeamStats.fouls,
                    total_fg_made: (window.db.getTeamSeasonStats(this.awayTeam.id)?.total_fg_made || 0) + awayTeamStats.fg_made,
                    total_fg_attempted: (window.db.getTeamSeasonStats(this.awayTeam.id)?.total_fg_attempted || 0) + awayTeamStats.fg_attempted,
                    total_ft_made: (window.db.getTeamSeasonStats(this.awayTeam.id)?.total_ft_made || 0) + awayTeamStats.ft_made,
                    total_ft_attempted: (window.db.getTeamSeasonStats(this.awayTeam.id)?.total_ft_attempted || 0) + awayTeamStats.ft_attempted,
                    total_three_made: (window.db.getTeamSeasonStats(this.awayTeam.id)?.total_three_made || 0) + awayTeamStats.three_made,
                    total_three_attempted: (window.db.getTeamSeasonStats(this.awayTeam.id)?.total_three_attempted || 0) + awayTeamStats.three_attempted,
                    total_minutes: (window.db.getTeamSeasonStats(this.awayTeam.id)?.total_minutes || 0) + awayTeamStats.minutes
                });
                console.log('✅ AWAY team season stats updated');
            } else {
                console.log('❌ No away team to save stats for'); // Debug log
            }
            console.log('=== END NEW TEAM STATS SAVE ==='); // Enhanced debug
        } catch (error) {
            console.error('Error saving team stats to new system:', error);
        }
    }

    // Finalize game statistics and mark as confirmed in database
    confirmGame() {
        if (confirm('Confirm this game? This will finalize all stats and cannot be undone.')) {
            this.saveGame();
            // Mark game as confirmed in database
            window.db.updateEvent(this.gameId, { status: 'confirmed' });
            alert('Game confirmed! Stats have been finalized.');
            window.location.href = 'calendar.html';
        }
    }

    // Check if player has recorded any statistical activity
    hasStats(player) {
        // Check if player has any stats recorded (including zeros for players who played but didn't score)
        return player.pts > 0 || player.ast > 0 || player.reb > 0 || player.stl > 0 || 
               player.to > 0 || player.blk > 0 || player.fgm > 0 || player.fga > 0 ||
               player.ftm > 0 || player.fta > 0 || player.tpm > 0 || player.tpa > 0 ||
               player.min > 0 || player.fouls > 0;
    }

    // Check if player has any recorded activity for team statistics counting
    hasAnyActivity(player) {
        // Check if player has any activity at all (used for counting players with stats in team totals)
        return this.hasStats(player);
    }

    // Update individual player season totals with game statistics
    updateSeasonTotals(gameStats) {
        // This would update season totals in the database
        // For now, the stats.html page will calculate averages dynamically
        gameStats.forEach(playerStat => {
            window.db.updatePlayerSeasonStats(playerStat.player_id, playerStat);
        });
    }

    // Entry Log Methods
    // Display modal with chronological log of all statistical entries
    showEntryLog() {
        const modal = document.createElement('div');
        modal.className = 'entry-log-modal';
        modal.innerHTML = `
            <div class="entry-log-content">
                <div class="entry-log-header">
                    <h3><i class="bi bi-list-ul"></i> Stats Entry Log</h3>
                    <button class="close-log-btn" onclick="this.closest('.entry-log-modal').remove()">×</button>
                </div>
                <div class="entry-log-body">
                    ${this.renderEntryLog()}
                </div>
            </div>
        `;
        
        // Add click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        document.body.appendChild(modal);
    }

    // Generate HTML for entry log display with delete options
    renderEntryLog() {
        if (this.entryLog.length === 0) {
            return '<div class="no-entries">No stat entries recorded yet</div>';
        }

        return this.entryLog.map((entry, index) => `
            <div class="entry-item">
                <div class="entry-info">
                    <div class="entry-player">${entry.playerName}</div>
                    <div class="entry-stat">${entry.statType.toUpperCase()}: +${entry.value}</div>
                    <div class="entry-time">${entry.time}</div>
                </div>
                <button class="delete-entry-btn" onclick="gameStatsApp.deleteEntry(${entry.id})">
                    <i class="bi bi-trash-fill"></i> Delete
                </button>
            </div>
        `).join('');
    }

    // Remove specific entry from log and subtract from player statistics
    deleteEntry(entryId) {
        const entry = this.entryLog.find(e => e.id === entryId);
        if (entry && confirm(`Delete ${entry.statType.toUpperCase()} entry for ${entry.playerName}?`)) {
            // Find the player and subtract the stat
            const allPlayers = [...this.gameData.homePlayers, ...this.gameData.awayPlayers];
            const player = allPlayers.find(p => p.id === entry.playerId);
            
            if (player && player.hasOwnProperty(entry.statType)) {
                player[entry.statType] = Math.max(0, player[entry.statType] - entry.value);
            }
            
            // Remove from entry log
            this.entryLog = this.entryLog.filter(e => e.id !== entryId);
            
            // Update displays
            this.updatePlayerDisplay();
            
            // Update the modal content
            const modalBody = document.querySelector('.entry-log-body');
            if (modalBody) {
                modalBody.innerHTML = this.renderEntryLog();
            }
        }
    }
}

// Initialize the app when DOM is loaded
let gameStatsApp;
document.addEventListener('DOMContentLoaded', () => {
    gameStatsApp = new GameStatsApp();
});
