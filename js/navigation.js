/**
 * File Name: navigation.js
 * Purpose: Provides dynamic navigation system that adapts based on user roles (Player, Coach, Manager). 
 *          Manages the top navigation bar, profile menus, 
 *          and ensures users only see menu items they have permission to access.
 * Author: Brooklyn Ridley
 * Date Created: 5th August 2025
 * Last Modified: 25th August 2025
    */
class NavigationManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    /**
     * PURPOSE: Initializes the navigation system with database dependency checking and user authentication
     * 
     * INPUTS: None (uses global window.db and getCurrentUser)
     * 
     * OUTPUTS:
     * - Navigation bar rendered with role-appropriate menu items
     * - Profile menu functionality enabled
     * - Retry mechanism for dependency loading
     * 
     * JUSTIFICATION: The initialization method ensures proper dependency loading order
     * and provides graceful handling of async database operations. The retry mechanism
     * prevents navigation failures during application startup.
     * 
     * FUTURE ENHANCEMENTS:
     * - Add loading indicators during initialization
     * - Implement progressive enhancement for offline scenarios
     * - Add navigation state persistence across sessions
     */
    init() {
        // Wait for database to be ready
        if (window.db && window.db.getCurrentUser()) {
            this.currentUser = window.db.getCurrentUser();
            this.renderNavbar();
        } else {
            // Retry after a short delay
            setTimeout(() => this.init(), 100);
        }
    }

    /**
     * PURPOSE: Renders complete navigation bar with role-based menu items and profile controls
     * 
     * INPUTS: None (uses this.currentUser and navigation item configuration)
     * 
     * OUTPUTS:
     * - Complete navigation HTML injected into navbar element
     * - Role-appropriate navigation icons and links
     * - Profile dropdown menu with user information
     * - Responsive navigation styling applied
     * 
     * JUSTIFICATION: This method provides the primary navigation interface for the
     * application, ensuring consistent user experience across all pages while
     * respecting role-based access control. The responsive design adapts to different
     * screen sizes for optimal usability.
     * 
     * FUTURE ENHANCEMENTS:
     * - Add navigation breadcrumbs for complex workflows
     * - Implement notification badges for pending actions
     * - Add keyboard navigation support for accessibility
     */
    renderNavbar() {
        const navbar = document.querySelector('.navbar');
        if (!navbar || !this.currentUser) return;

        // Clear existing content
        navbar.innerHTML = '';

        // Create navbar structure
        navbar.innerHTML = `
            <div class="nav-icons">
                ${this.getNavigationItems().map(item => `
                    <a href="${item.href}" class="nav-icon ${item.active ? 'active' : ''}" title="${item.title}">
                        ${item.icon}
                    </a>
                `).join('')}
            </div>
            <div class="nav-brand">
                <h1>TeamForge</h1>
            </div>
            <div class="nav-profile">
                <span class="profile-name">${this.currentUser.first_name} ${this.currentUser.last_name}</span>
                <div class="profile-avatar" title="Profile Menu" onclick="navManager.toggleProfileMenu(event)">
                    ${this.currentUser.avatar}
                </div>
            </div>
        `;

        // Add profile menu functionality
        this.addProfileMenuStyles();
    }

    /**
     * PURPOSE: Generates role-specific navigation items with active state management
     * 
     * INPUTS: None (uses current page URL and user role from this.currentUser)
     * 
     * OUTPUTS:
     * - Array of navigation item objects with href, icon, title, and active state
     * - Role-filtered menu items for appropriate access control
     * - Active page highlighting for current location
     * 
     * JUSTIFICATION: This method implements comprehensive role-based access control
     * by providing different navigation options for players, coaches, managers, and
     * parents. The active state management helps users understand their current location.
     * 
     * FUTURE ENHANCEMENTS:
     * - Add dynamic menu items based on team membership
     * - Implement conditional navigation based on feature flags
     * - Add navigation analytics for user behavior tracking
     */
    getNavigationItems() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const role = this.currentUser.role;
        
        // Base items available to all users
        const baseItems = [
            { 
                href: 'index.html', 
                icon: '<i class="bi bi-house-fill"></i>', 
                title: 'Home', 
                active: currentPage === 'index.html',
                roles: ['player', 'coach', 'manager', 'parent']
            },
            { 
                href: 'calendar.html', 
                icon: '<i class="bi bi-calendar3"></i>', 
                title: 'Calendar', 
                active: currentPage === 'calendar.html',
                roles: ['player', 'coach', 'manager', 'parent']
            }
        ];

        // Role-specific items
        const roleItems = {
            'player': [
                { 
                    href: 'profile.html', 
                    icon: '<i class="bi bi-person-circle"></i>', 
                    title: 'My Profile', 
                    active: currentPage === 'profile.html' 
                },
                { 
                    href: 'stats.html', 
                    icon: '<i class="bi bi-bar-chart-fill"></i>', 
                    title: 'Statistics', 
                    active: currentPage === 'stats.html' 
                }
            ],
            'coach': [
                { 
                    href: 'manager.html', 
                    icon: '<i class="bi bi-gear-fill"></i>', 
                    title: 'Team Manager', 
                    active: currentPage === 'manager.html' 
                },
                { 
                    href: 'roster.html', 
                    icon: '<i class="bi bi-people-fill"></i>', 
                    title: 'Team Roster', 
                    active: currentPage === 'roster.html' 
                },
                { 
                    href: 'stats.html', 
                    icon: '<i class="bi bi-bar-chart-fill"></i>', 
                    title: 'Team Statistics', 
                    active: currentPage === 'stats.html' 
                }
            ],
            'manager': [
                { 
                    href: 'profile.html', 
                    icon: '<i class="bi bi-person-circle"></i>', 
                    title: 'My Profile', 
                    active: currentPage === 'profile.html' 
                },
                { 
                    href: 'stats.html', 
                    icon: '<i class="bi bi-bar-chart-fill"></i>', 
                    title: 'Team Statistics', 
                    active: currentPage === 'stats.html' 
                }
            ],
            'parent': [
                { 
                    href: 'profile.html', 
                    icon: '<i class="bi bi-person-circle"></i>', 
                    title: 'My Profile', 
                    active: currentPage === 'profile.html' 
                },
                { 
                    href: 'stats.html', 
                    icon: '<i class="bi bi-bar-chart-fill"></i>', 
                    title: 'Team Statistics', 
                    active: currentPage === 'stats.html' 
                }
            ]
        };

        // Combine base items with role-specific items
        const allItems = [...baseItems, ...(roleItems[role] || [])];
        
        // Filter items based on current user's role
        return allItems.filter(item => 
            !item.roles || item.roles.includes(role)
        );
    }

    /**
     * PURPOSE: Creates and displays profile dropdown menu with user information and actions
     * 
     * INPUTS: event (click event object for positioning)
     * 
     * OUTPUTS:
     * - Profile dropdown menu positioned near clicked element
     * - User information display with avatar and role
     * - Role-appropriate menu actions and navigation links
     * - Click-outside-to-close functionality
     * 
     * JUSTIFICATION: The profile menu provides essential user account management
     * and quick navigation options. The positioning system ensures the menu appears
     * correctly on different screen sizes and the click-outside functionality
     * provides intuitive user interaction patterns.
     * 
     * FUTURE ENHANCEMENTS:
     * - Add user preference settings within the menu
     * - Implement recent activity or notification indicators
     * - Add theme switching and accessibility options
     */
    toggleProfileMenu(event) {
        event.preventDefault();
        event.stopPropagation();
        
        // Remove existing menu
        this.hideProfileMenu();

        const menu = document.createElement('div');
        menu.className = 'profile-dropdown-menu';
        menu.innerHTML = `
            <div class="profile-menu-header">
                <div class="profile-menu-avatar">${this.currentUser.avatar}</div>
                <div class="profile-menu-info">
                    <div class="profile-menu-name">${this.currentUser.first_name} ${this.currentUser.last_name}</div>
                    <div class="profile-menu-role">${this.formatRole(this.currentUser.role)}</div>
                </div>
            </div>
            <div class="profile-menu-divider"></div>
            <div class="profile-menu-items">
                ${this.currentUser.role === 'player' || this.currentUser.role === 'manager' || this.currentUser.role === 'parent' ? `
                    <div class="profile-menu-item" onclick="window.location.href='profile.html'">
                        <span class="menu-icon">👤</span>
                        <span>My Profile</span>
                    </div>
                ` : ''}
                <div class="profile-menu-item" onclick="window.location.href='calendar.html'">
                    <span class="menu-icon"><i class="bi bi-calendar3"></i></span>
                    <span>Calendar</span>
                </div>
                <div class="profile-menu-item" onclick="navManager.showSettings()">
                    <span class="menu-icon"><i class="bi bi-gear-fill"></i></span>
                    <span>Settings</span>
                </div>
                <div class="profile-menu-divider"></div>
                <div class="profile-menu-item logout" onclick="auth.logout()">
                    <span class="menu-icon"><i class="bi bi-box-arrow-right"></i></span>
                    <span>Sign Out</span>
                </div>
            </div>
        `;

        // Position menu
        const rect = event.target.getBoundingClientRect();
        menu.style.cssText = `
            position: fixed;
            top: ${rect.bottom + 10}px;
            right: ${window.innerWidth - rect.right}px;
            z-index: 1000;
        `;

        document.body.appendChild(menu);

        // Click outside to close
        setTimeout(() => {
            document.addEventListener('click', this.hideProfileMenu.bind(this), { once: true });
        }, 100);
    }

    // Remove profile dropdown menu from DOM
    hideProfileMenu() {
        const menu = document.querySelector('.profile-dropdown-menu');
        if (menu) {
            menu.remove();
        }
    }

    // Format user role for display in profile menu
    formatRole(role) {
        const roleNames = {
            'player': 'Player',
            'coach': 'Coach',
            'manager': 'Manager',
            'parent': 'Parent'
        };
        return roleNames[role] || role;
    }

    // Show settings placeholder and hide profile menu
    showSettings() {
        alert('Settings feature coming soon!');
        this.hideProfileMenu();
    }

    // Add comprehensive CSS styles for profile menu and navigation
    addProfileMenuStyles() {
        // Add styles if not already present
        if (document.getElementById('profile-menu-styles')) return;

        const style = document.createElement('style');
        style.id = 'profile-menu-styles';
        style.textContent = `
            .profile-avatar {
                cursor: pointer;
                transition: all 0.2s ease;
                background: #3182ce;
                color: white;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 0.9rem;
            }

            .profile-avatar:hover {
                background: #2c5aa0;
                transform: scale(1.05);
            }

            .profile-dropdown-menu {
                background: #2d3748;
                border: 1px solid #4a5568;
                border-radius: 12px;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
                min-width: 250px;
                overflow: hidden;
                animation: profileMenuSlide 0.2s ease-out;
            }

            @keyframes profileMenuSlide {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .profile-menu-header {
                display: flex;
                align-items: center;
                padding: 1rem;
                background: #1a1d23;
            }

            .profile-menu-avatar {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: #3182ce;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                margin-right: 0.75rem;
            }

            .profile-menu-info {
                flex: 1;
            }

            .profile-menu-name {
                font-weight: 600;
                color: #e4e7ea;
                margin-bottom: 0.25rem;
            }

            .profile-menu-role {
                font-size: 0.875rem;
                color: #a0aec0;
            }

            .profile-menu-divider {
                height: 1px;
                background: #4a5568;
                margin: 0.5rem 0;
            }

            .profile-menu-items {
                padding: 0.5rem 0;
            }

            .profile-menu-item {
                display: flex;
                align-items: center;
                padding: 0.75rem 1rem;
                cursor: pointer;
                transition: background-color 0.2s ease;
                color: #e4e7ea;
            }

            .profile-menu-item:hover {
                background: #1a1d23;
            }

            .profile-menu-item.logout {
                color: #ef4444;
            }

            .profile-menu-item.logout:hover {
                background: rgba(239, 68, 68, 0.1);
            }

            .menu-icon {
                margin-right: 0.75rem;
                font-size: 1rem;
                width: 20px;
                text-align: center;
            }

            /* Consistent navbar styling */
            .navbar {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 2rem;
                height: 70px;
                background: #0f1419;
            }

            .nav-icons {
                display: flex;
                gap: 1rem;
                align-items: center;
            }

            .nav-icon {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 44px;
                height: 44px;
                border-radius: 12px;
                text-decoration: none;
                font-size: 1.2rem;
                transition: all 0.2s ease;
                color: #a0aec0;
                background: transparent;
            }

            .nav-icon:hover {
                background: #2d3748;
                color: #e4e7ea;
                transform: translateY(-1px);
            }

            .nav-icon.active {
                background: #3182ce;
                color: white;
            }

            .nav-brand h1 {
                color: #e4e7ea;
                font-size: 1.5rem;
                font-weight: bold;
                margin: 0;
            }

            .nav-profile {
                display: flex;
                align-items: center;
                gap: 1rem;
            }

            .profile-name {
                color: #e4e7ea;
                font-weight: 500;
                font-size: 0.95rem;
            }

            @media (max-width: 768px) {
                .navbar {
                    padding: 0 1rem;
                }

                .profile-name {
                    display: none;
                }

                .nav-icons {
                    gap: 0.5rem;
                }

                .nav-icon {
                    width: 40px;
                    height: 40px;
                    font-size: 1.1rem;
                }

                .profile-dropdown-menu {
                    right: 10px;
                    min-width: 220px;
                    top: auto;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Update navigation when user changes
    // Update navigation when user data changes
    updateUser() {
        this.currentUser = window.db?.getCurrentUser();
        if (this.currentUser) {
            this.renderNavbar();
        }
    }
    // Show role-appropriate options for events
    /**
     * PURPOSE: Generates role-appropriate event actions for calendar and event management
     * 
     * INPUTS: 
     * - event (event object with type and metadata)
     * - userRole (string representing user's role in the system)
     * 
     * OUTPUTS:
     * - Array of action objects with label, action type, and icon
     * - Role-filtered actions for proper permission control
     * - Context-sensitive options based on event type
     * 
     * JUSTIFICATION: This method implements granular permission control for event
     * management, ensuring users only see actions they're authorized to perform.
     * The role-based filtering prevents unauthorized access while providing
     * intuitive interfaces for different user types.
     * 
     * FUTURE ENHANCEMENTS:
     * - Add dynamic permissions based on team ownership
     * - Implement conditional actions based on event status
     * - Add bulk action support for multiple events
     */
    getEventActions(event, userRole) {
        const actions = [];

        if (['coach'].includes(userRole)) {
            actions.push({
                label: 'Edit Event',
                action: 'edit',
                icon: '<i class="bi bi-pencil-fill"></i>'
            });
            
            if (event.event_type === 'game') {
                actions.push({
                    label: 'Manage Stats',
                    action: 'manage_stats',
                    icon: '<i class="bi bi-bar-chart-fill"></i>'
                });
                actions.push({
                    label: 'View Availability',
                    action: 'view_availability',
                    icon: '<i class="bi bi-people-fill"></i>'
                });
            } else {
                actions.push({
                    label: 'View Availability',
                    action: 'view_availability',
                    icon: '<i class="bi bi-people-fill"></i>'
                });
            }
        } else if (['manager'].includes(userRole)) {
            // Managers can add stats and schedule games but not access manager page
            if (event.event_type === 'game') {
                actions.push({
                    label: 'Add Stats',
                    action: 'add_stats',
                    icon: '<i class="bi bi-bar-chart-fill"></i>'
                });
            }
            actions.push({
                label: 'Schedule Game',
                action: 'schedule_game',
                icon: '<i class="bi bi-calendar-plus"></i>'
            });
        } else if (userRole === 'player') {
            actions.push({
                label: 'Set Availability',
                action: 'set_availability',
                icon: '✓'
            });
            
            if (event.event_type === 'game') {
                actions.push({
                    label: 'View Stats',
                    action: 'view_stats',
                    icon: '<i class="bi bi-bar-chart-fill"></i>'
                });
            }
        } else if (userRole === 'parent') {
            // Parents can only view, no actions
            if (event.event_type === 'game') {
                actions.push({
                    label: 'View Stats',
                    action: 'view_stats',
                    icon: '<i class="bi bi-bar-chart-fill"></i>'
                });
            }
        }

        return actions;
    }

    // Check if user can perform action
    /**
     * PURPOSE: Validates user permissions for specific actions across the application
     * 
     * INPUTS:
     * - action (string representing the action to be performed)
     * - userRole (string representing user's role in the system)
     * 
     * OUTPUTS:
     * - Boolean indicating whether user can perform the specified action
     * - Comprehensive permission matrix for all application features
     * 
     * JUSTIFICATION: Centralized permission checking ensures consistent security
     * across all application features while preventing unauthorized access to
     * sensitive functionality. The permission matrix provides clear role definitions
     * and easy maintenance of access control rules.
     * 
     * FUTURE ENHANCEMENTS:
     * - Add team-specific permission overrides
     * - Implement permission inheritance and delegation
     * - Add audit logging for permission checks and violations
     */
    canPerformAction(action, userRole) {
        const permissions = {
            'add_event': ['coach', 'manager'],
            'edit_event': ['coach'],
            'delete_event': ['coach'],
            'manage_stats': ['coach'],
            'add_game_stats': ['coach', 'manager'],
            'schedule_games': ['coach', 'manager'],
            'view_all_availability': ['coach'],
            'set_availability': ['player', 'coach', 'manager', 'parent'],
            'manage_lineup': ['coach'],
            'view_team_notes': ['coach', 'manager', 'parent', 'player'],
            'add_team_note': ['coach'],
            'edit_player_profile': ['player'], // Only own profile
            'view_player_profiles': ['coach'],
            'view_stats': ['coach', 'manager', 'parent', 'player']
        };

        return permissions[action]?.includes(userRole) || false;
    }
}

// Initialize navigation manager
document.addEventListener('DOMContentLoaded', () => {
    // Wait for auth and database to be ready
    const initNav = () => {
        if (window.auth && window.db) {
            window.navManager = new NavigationManager();
        } else {
            setTimeout(initNav, 50);
        }
    };
    initNav();
});
