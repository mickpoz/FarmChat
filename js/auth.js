// Show/hide auth forms
function showLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
}

function showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

// Authentication functions
async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        showChat();
        loadUserProfile(userCredential.user.uid);
    } catch (error) {
        alert('Login failed: ' + error.message);
    }
}

async function register() {
    const username = document.getElementById('username').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const avatarFile = document.getElementById('avatar').files[0];

    try {
        // Create user account
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const userId = userCredential.user.uid;

        // Upload avatar if provided
        let avatarUrl = '';
        if (avatarFile) {
            const storageRef = firebase.storage().ref(`avatars/${userId}`);
            await storageRef.put(avatarFile);
            avatarUrl = await storageRef.getDownloadURL();
        }

        // Create user profile in Firestore
        await db.collection('users').doc(userId).set({
            username: username,
            email: email,
            avatarUrl: avatarUrl,
            status: 'Just joined Farm Chat!',
            spotifyUrl: '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showChat();
        loadUserProfile(userId);
    } catch (error) {
        alert('Registration failed: ' + error.message);
    }
}

// UI Management
function showChat() {
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('chatContainer').style.display = 'grid';
}

function loadUserProfile(userId) {
    db.collection('users').doc(userId).onSnapshot((doc) => {
        if (doc.exists) {
            const userData = doc.data();
            document.getElementById('userName').textContent = userData.username;
            document.getElementById('userStatus').textContent = userData.status;
            document.getElementById('userSpotify').href = userData.spotifyUrl;
            if (userData.avatarUrl) {
                document.getElementById('userAvatar').src = userData.avatarUrl;
            }
        }
    });
}

// Update user profile
async function updateStatus() {
    const userId = auth.currentUser.uid;
    const newStatus = document.getElementById('statusInput').value;
    
    if (newStatus.trim()) {
        await db.collection('users').doc(userId).update({
            status: newStatus
        });
        document.getElementById('statusInput').value = '';
    }
}

async function updateSpotify() {
    const userId = auth.currentUser.uid;
    const newSpotifyUrl = document.getElementById('spotifyInput').value;
    
    if (newSpotifyUrl.trim()) {
        await db.collection('users').doc(userId).update({
            spotifyUrl: newSpotifyUrl
        });
        document.getElementById('spotifyInput').value = '';
    }
}

// Check auth state
auth.onAuthStateChanged((user) => {
    if (user) {
        showChat();
        loadUserProfile(user.uid);
    } else {
        document.getElementById('authContainer').style.display = 'block';
        document.getElementById('chatContainer').style.display = 'none';
        showLogin();
    }
}); 