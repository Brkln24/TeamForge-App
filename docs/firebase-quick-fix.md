# Quick Fix Script for TeamForge Firebase Integration

## Files that need modern-firebase-adapter.js added:

### 1. profile.html

Add this line after database.js:

```html
<script src="js/database.js"></script>
<script src="js/modern-firebase-adapter.js"></script>
```

### 2. manager.html

Add this line after database.js:

```html
<script src="js/database.js"></script>
<script src="js/modern-firebase-adapter.js"></script>
```

### 3. notes.html

Add this line after database.js:

```html
<script src="js/database.js"></script>
<script src="js/modern-firebase-adapter.js"></script>
```

### 4. calendar.html

Add this line after database.js:

```html
<script src="js/database.js"></script>
<script src="js/modern-firebase-adapter.js"></script>
```

### 5. game-stats.html

Add this line after database.js:

```html
<script src="js/database.js"></script>
<script src="js/modern-firebase-adapter.js"></script>
```

## Testing Commands

After adding the adapter to all files, test these in browser console:

```javascript
// Check if modern adapter is loaded
console.log("Database type:", window.db.constructor.name);

// Should show: "ModernFirebaseDatabaseManager"

// Test sync function
window.db.syncLocalToFirebase();

// Test connection status
console.log("Connection:", window.db.getConnectionStatus());
```

## Expected Results

✅ **Firebase initializes** - You should see console message
✅ **Modern adapter loads** - Database type should be "ModernFirebaseDatabaseManager"  
✅ **User registration works** - New users appear in Firebase Console
✅ **Sync function available** - No "function not found" errors
✅ **Dashboard loads** - No HTML container errors
