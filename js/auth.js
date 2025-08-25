/**
 * File Name: auth.js
 * Purpose: Purpose: Handles user authentication and login/logout functionality. 
 *          Manages user sessions, form validation, 
 *          and redirects users to appropriate pages based on authentication status.
 * Author: Brooklyn Ridley
 * Date Created:  5th August 2025
 * Last Modified: 25th August 2025
    */
class AuthSystem {
    constructor() {
        this.init();
    }

    // Initialize authentication system and set up appropriate handlers
    init() {
        // Check if we're on the login page
        if (document.getElementById('loginForm')) {
            this.setupLoginForm();
        }

        // Auto-redirect if user is already logged in and not on login page
        if (!window.location.pathname.includes('login.html') && window.db?.getCurrentUser()) {
            this.checkAuthentication();
        }
    }

    // Set up login form event handlers for submission and keyboard input
    setupLoginForm() {
        const form = document.getElementById('loginForm');
        const loginBtn = document.getElementById('loginBtn');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin();
        });

        // Enable Enter key submission
        form.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleLogin();
            }
        });
    }

    /**
     * PURPOSE: Handles user login authentication with comprehensive validation, loading states, and role-based redirection
     * INPUTS: None (retrieves username and password from DOM form elements)
     * OUTPUTS: Authenticates user, displays success/error messages, and redirects to appropriate page based on user role
     * JUSTIFICATION: Core authentication function that manages the complete login workflow including input validation, database authentication, UI feedback, and secure redirection
     * FUTURE ENHANCEMENTS: Add two-factor authentication, implement remember me functionality, add login attempt limiting with temporary lockouts
     */
    async handleLogin() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const loginBtn = document.getElementById('loginBtn');
        const messageContainer = document.getElementById('messageContainer');

        if (!username || !password) {
            this.showMessage('Please enter both username and password', 'error');
            return;
        }

        // Disable button and show loading state
        loginBtn.disabled = true;
        loginBtn.textContent = 'Signing in...';

        try {
            const result = await window.db.authenticate(username, password);

            if (result.success) {
                this.showMessage('Login successful! Redirecting...', 'success');
                
                // Redirect based on user role
                setTimeout(() => {
                    this.redirectToDefaultPage(result.user.role);
                }, 1000);
            } else {
                this.showMessage(result.message || 'Invalid credentials', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showMessage('Login failed. Please try again.', 'error');
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Sign In';
        }
    }

    // Redirect user to home page regardless of role (centralized landing page)
    redirectToDefaultPage(role) {
        // Always redirect to home page after login
        window.location.href = 'index.html';
    }

    /**
     * PURPOSE: Validates user access permissions for the current page based on role-based access control rules
     * INPUTS: None (uses current user from database and current page URL)
     * OUTPUTS: Returns boolean indicating access permission and redirects unauthorized users to appropriate pages
     * JUSTIFICATION: Critical security function that enforces role-based page access restrictions to prevent unauthorized access to sensitive functionality
     * FUTURE ENHANCEMENTS: Add granular page permissions, implement audit logging for access attempts, add role inheritance system
     */
    checkPageAccess() {
        const currentUser = window.db?.getCurrentUser();
        if (!currentUser) {
            window.location.href = 'login.html';
            return false;
        }

        const currentPage = window.location.pathname.split('/').pop();
        
        // Role-based page access control
        if (currentPage === 'profile.html' && !['player', 'manager', 'parent'].includes(currentUser.role)) {
            this.redirectToDefaultPage(currentUser.role);
            return false;
        }
        
        // Manager page is only accessible to coaches (managers and parents cannot access it)
        if (currentPage === 'manager.html' && !['coach'].includes(currentUser.role)) {
            this.redirectToDefaultPage(currentUser.role);
            return false;
        }

        return true;
    }

    /**
     * PURPOSE: Determines user permissions for specific actions based on comprehensive role-permission mapping system
     * INPUTS: permission (string representing the specific permission to check)
     * OUTPUTS: Returns boolean indicating whether current user has the requested permission
     * JUSTIFICATION: Centralized permission system that enables fine-grained access control across all application features while maintaining role-based security
     * FUTURE ENHANCEMENTS: Add dynamic permission loading from database, implement permission groups, add temporary permission grants
     */
    hasPermission(permission) {
        const currentUser = window.db?.getCurrentUser();
        if (!currentUser) return false;

        const permissions = {
            'add_events': ['coach', 'manager'],
            'edit_stats': ['coach', 'manager'],
            'manage_team': ['coach'],
            'view_all_stats': ['coach', 'manager', 'parent', 'player'],
            'edit_lineups': ['coach'],
            'manage_players': ['coach'],
            'add_game_stats': ['coach', 'manager'],
            'schedule_games': ['coach', 'manager']
        };

        return permissions[permission]?.includes(currentUser.role) || false;
    }

    // Pre-fill login form with demo user credentials for testing
    fillDemoUser(username, password) {
        document.getElementById('username').value = username;
        document.getElementById('password').value = password;
    }

    // Display temporary message notifications with automatic clearing for errors
    showMessage(message, type) {
        const messageContainer = document.getElementById('messageContainer');
        const messageClass = type === 'error' ? 'error-message' : 'success-message';
        
        messageContainer.innerHTML = `
            <div class="${messageClass}">
                ${message}
            </div>
        `;

        // Auto-clear error messages after 5 seconds
        if (type === 'error') {
            setTimeout(() => {
                messageContainer.innerHTML = '';
            }, 5000);
        }
    }

    /**
     * PURPOSE: Validates user authentication status and enforces access control across the entire application
     * INPUTS: None (checks current user authentication status and current page)
     * OUTPUTS: Returns boolean authentication status and redirects unauthenticated users to public pages
     * JUSTIFICATION: Primary security gateway that protects all application pages from unauthorized access and ensures proper authentication flow
     * FUTURE ENHANCEMENTS: Add session timeout handling, implement automatic token refresh, add concurrent session management
     */
    checkAuthentication() {
        const currentUser = window.db?.getCurrentUser();
        if (!currentUser) {
            // Redirect to landing page if not authenticated and not already on landing/login/register
            const currentPage = window.location.pathname.split('/').pop();
            const publicPages = ['landing.html', 'login.html', 'register.html'];
            
            if (!publicPages.includes(currentPage)) {
                window.location.href = 'landing.html';
            }
            return false;
        }
        
        // Check page access permissions
        return this.checkPageAccess();
    }

    // Log out current user with confirmation and redirect to landing page
    logout() {
        if (confirm('Are you sure you want to log out?')) {
            window.db.logout();
            window.location.href = 'landing.html';
        }
    }

    // Update navigation bar with current user information via navigation manager
    updateNavbar() {
        // The navigation manager will handle this
        if (window.navManager) {
            window.navManager.updateUser();
        }
    }

}

// Initialize authentication system
document.addEventListener('DOMContentLoaded', () => {
    window.auth = new AuthSystem();
});
