// Demo script to test database functionality
// Run this in the browser console after loading a page with database.js

function testDatabase() {
    console.log('=== TeamForge Database Test ===');
    
    // Test 1: Check if database is initialized
    console.log('1. Database Status:');
    console.log('- Current User:', window.db.getCurrentUser());
    console.log('- Teams:', window.db.getTeams());
    console.log('- Users:', window.db.getTable('users'));
    
    // Test 2: Test authentication
    console.log('\n2. Testing Authentication:');
    
    // Test login with demo user
    window.db.authenticate('brooklyn.ridley', 'password123').then(result => {
        console.log('- Player login result:', result);
        
        if (result.success) {
            console.log('- Current user after login:', window.db.getCurrentUser());
            
            // Test 3: Test profile data
            console.log('\n3. Testing Profile Data:');
            const profile = window.db.getPlayerProfile(result.user.id);
            console.log('- Player profile:', profile);
            
            const stats = window.db.getAggregatedPlayerStats(result.user.id);
            console.log('- Player stats:', stats);
            
            // Test 4: Test team data
            console.log('\n4. Testing Team Data:');
            const userTeams = window.db.getUserTeams(result.user.id);
            console.log('- User teams:', userTeams);
            
            if (userTeams.length > 0) {
                const teamMembers = window.db.getTeamMembers(userTeams[0].id);
                console.log('- Team members:', teamMembers);
            }
            
            // Test 5: Test notes
            console.log('\n5. Testing Notes:');
            const notes = window.db.getNotes(result.user.id);
            console.log('- User notes:', notes);
            
            // Test creating a note
            const newNote = window.db.createNote({
                recipient_id: result.user.id,
                content: 'Test note from demo script',
                note_type: 'personal',
                priority: 'medium'
            });
            console.log('- Created note:', newNote);
            
            console.log('\n=== Test Complete ===');
        }
    });
    
    // Test coach login
    setTimeout(() => {
        console.log('\n6. Testing Coach Login:');
        window.db.authenticate('coach.smith', 'coach123').then(result => {
            console.log('- Coach login result:', result);
            
            if (result.success) {
                const userTeams = window.db.getUserTeams(result.user.id);
                console.log('- Coach teams:', userTeams);
            }
        });
    }, 1000);
}

// Auto-run test if this script is loaded
if (typeof window !== 'undefined' && window.db) {
    testDatabase();
} else {
    console.log('Database not loaded yet. Run testDatabase() manually.');
}
