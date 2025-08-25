# TeamForge - Basketball Manager App

WARNING!! Written by AI to help you navigate the Application. DO NOT MARK!!!

A comprehensive web-based basketball team management application designed for coaches, team managers, and basketball enthusiasts. Built with modern web technologies and optimized for performance.

## Features

### Core Functionality

- **Team Management**: Create, edit, and manage multiple basketball teams with custom branding
- **Player Management**: Detailed player profiles with biometric data, statistics, and roster management
- **Game Scheduling**: Calendar-based scheduling with availability tracking
- **Statistics Tracking**: Comprehensive player and team performance analytics
- **Dashboard**: Real-time overview of key metrics and recent activity
- **User Authentication**: Secure login system with role-based access (Player, Coach, Manager)

### Advanced Features

- **Registration Keys**: Secure team invitation system for new players
- **Player Profiles**: Biometric tracking (height, weight, wingspan, vertical jump)
- **Game Statistics**: Detailed game-by-game stat entry and analysis
- **Team Communication**: Message system and notes management
- **Lineup Builder**: Visual lineup creation and management tools
- **Multi-Role Support**: Different interfaces for players, coaches, and managers

## Project Structure

```
TeamForge v1/
├── 📄 index.html                    # Application dashboard/landing page
├── 📄 login.html                    # User authentication
├── 📄 register.html                 # User registration with team keys
├── 📄 profile.html                  # User profile management
├── 📄 teams.html                    # Team management interface
├── 📄 roster.html                   # Team roster display
├── 📄 players.html                  # Player management
├── 📄 manager.html                  # Manager dashboard
├── 📄 calendar.html                 # Event scheduling and availability
├── 📄 stats.html                    # Statistics dashboard
├── 📄 stats-entry.html              # Game statistics entry
├── 📄 game-stats.html               # Game statistics display
├── 📁 css/
│   ├── styles.css                   # Main application styles with dark theme
│   ├── components.css               # Reusable UI components
│   ├── manager.css                  # Manager-specific styling
│   └── role-based.css               # Role-based interface adaptations
├── 📁 js/
│   ├── database.js                  # Core database operations (localStorage)
│   ├── auth.js                      # Authentication and authorization
│   ├── app.js                       # Main application logic
│   ├── navigation.js                # SPA navigation management
│   ├── calendar.js                  # Calendar and scheduling
│   ├── teams.js                     # Team management logic
│   ├── players.js                   # Player management logic
│   ├── manager.js                   # Manager functionality
│   ├── profile.js                   # Profile management
│   └── game-stats.js                # Game statistics handling
├── 📁 database/
│   └── schema.sql                   # Database schema documentation
├── 📁 archive/                      # Performance optimization
│   ├── debug-files/                 # Debug and diagnostic utilities
│   ├── test-utilities/              # Test data generators and tools
│   └── old-versions/                # Legacy code and backups
├── 📁 .github/
│   └── copilot-instructions.md      # AI coding guidelines
├── 📁 .vscode/
│   └── tasks.json                   # VS Code task configuration
├── 📄 .gitignore                    # Git ignore patterns
├── 📄 PROJECT_STRUCTURE.md          # Detailed project organization
├── 📄 OPTIMIZATION_REPORT.md        # Performance optimization details
└── 📄 README.md                     # This file
```

## Getting Started

### Prerequisites

- Modern web browser (Chrome 70+, Firefox 65+, Safari 12+, Edge 79+)
- Visual Studio Code (recommended)
- Live Server extension for VS Code

### Installation & Setup

1. Clone or download the project to your local machine
2. Open the project folder in Visual Studio Code
3. Install the Live Server extension (if not already installed)
4. Right-click on `index.html` and select "Open with Live Server"
5. The application will open in your default browser at `http://localhost:5500`

### First Time Setup

1. **Create Account**: Register as a new user on the registration page
2. **Create Team**: Set up your first basketball team
3. **Generate Registration Key**: Create invitation codes for players
4. **Add Players**: Share registration keys with team members
5. **Start Managing**: Begin scheduling games and tracking statistics

## Architecture & Technology

### Core Technologies

- **HTML5**: Semantic markup with modern web standards
- **CSS3**: Advanced styling with CSS Grid, Flexbox, and CSS Variables
- **JavaScript (ES6+)**: Modern JavaScript with classes, modules, and async operations
- **localStorage**: Client-side data persistence (no server required)

### Design Patterns

- **Single Page Application (SPA)**: Smooth navigation without page reloads
- **Component-Based CSS**: Reusable UI components with BEM methodology
- **Class-Based JavaScript**: Object-oriented approach for maintainability
- **Role-Based Access**: Different interfaces for players, coaches, and managers
- **Mobile-First Design**: Responsive layouts for all device sizes

## Development Guidelines

### CSS Architecture

- **styles.css**: Main application styles, CSS variables, dark theme, form components
- **components.css**: Reusable UI components (cards, buttons, modals, navigation)
- **manager.css**: Manager-specific interface styling
- **role-based.css**: Role-specific adaptations and permissions
- **BEM Methodology**: Block Element Modifier naming convention
- **CSS Variables**: Consistent theming and easy customization

### JavaScript Structure

- **Modular Architecture**: Separate files for different functionalities
- **Class-Based Design**: OOP principles for database and component management
- **Event-Driven**: Interactive user interface with modern event handling
- **No External Dependencies**: Pure JavaScript implementation
- **localStorage Database**: Complete CRUD operations without backend

### Database Schema

The application uses a localStorage-based database with the following tables:

- `users`: User accounts and authentication
- `teams`: Team information and branding
- `team_memberships`: Player-team relationships
- `player_profiles`: Biometric and personal data
- `events`: Games and practice scheduling
- `availability`: Player availability tracking
- `game_stats`: Individual game statistics
- `season_stats`: Aggregated season statistics
- `notes`: Communication and message system

## Performance Optimization

This codebase has been optimized for performance:

- **79% file reduction**: Moved 25+ debug files to archive
- **Code cleanup**: Removed redundant methods and excessive logging
- **Organized structure**: Clean workspace for faster development
- **Optimized database**: Streamlined queries and reduced complexity

See `OPTIMIZATION_REPORT.md` for detailed performance improvements.

## Browser Support

This application supports all modern browsers including:

- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+

## Contributing

When adding new features or implementing enhancements:

### Code Standards

1. **Follow BEM CSS methodology** for class naming conventions
2. **Use existing component styles** when possible for consistency
3. **Maintain responsive design principles** for all screen sizes
4. **Keep JavaScript modular** and well-documented with JSDoc comments
5. **Test across different browsers** and device sizes
6. **Use CSS variables** for theming and consistent styling

### Development Workflow

1. **Create feature branches** for new functionality
2. **Use the archive folder** for experimental or debug files
3. **Follow the established file structure** in project documentation
4. **Update documentation** when adding new features
5. **Test thoroughly** before committing changes

### File Organization

- Keep main directory clean (core application files only)
- Use `archive/` for debug, test, and experimental files
- Follow the documented project structure
- Add new CSS components to `components.css`
- Create new JS modules for major features

## Browser Support

This application supports all modern browsers:

- **Chrome 70+** ✅ (Fully supported)
- **Firefox 65+** ✅ (Fully supported)
- **Safari 12+** ✅ (Fully supported)
- **Edge 79+** ✅ (Fully supported)
- **Mobile browsers** ✅ (Responsive design)

## Future Enhancements

### Planned Features

- **Player photo uploads** with file management
- **Advanced analytics dashboard** with charts and graphs
- **Export functionality** for statistics and reports
- **Team communication hub** with real-time messaging
- **Game video analysis** integration
- **Mobile app version** with offline capabilities

### Technical Improvements

- **Database migration** to server-based solution
- **Real-time synchronization** across devices
- **Progressive Web App (PWA)** capabilities
- **Performance monitoring** and optimization
- **Automated testing** suite implementation

## Support & Documentation

- **Project Structure**: See `PROJECT_STRUCTURE.md` for detailed organization
- **Performance Reports**: Check `OPTIMIZATION_REPORT.md` for optimization details
- **Coding Guidelines**: Review `.github/copilot-instructions.md` for development standards
- **Database Schema**: Reference `database/schema.sql` for data structure

## License

This project is developed for educational purposes as part of Year 12 Software Development coursework at Balwyn High School.
