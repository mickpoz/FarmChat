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
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
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
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const userId = userCredential.user.uid;

        // Upload avatar if provided
        let avatarUrl = '';
        if (avatarFile) {
            const storageRef = firebase.storage().ref(`avatars/${userId}`);
            await storageRef.put(avatarFile);
            avatarUrl = await storageRef.getDownloadURL();
        }

        // Create user profile in Firestore
        await firebase.firestore().collection('users').doc(userId).set({
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

// Avatar editing functions
function showAvatarEdit() {
    document.getElementById('avatarEditModal').style.display = 'block';
}

function hideAvatarEdit() {
    document.getElementById('avatarEditModal').style.display = 'none';
}

async function updateAvatar() {
    const newAvatarFile = document.getElementById('newAvatar').files[0];
    if (!newAvatarFile) {
        alert('Please select an image file');
        return;
    }

    try {
        const userId = firebase.auth().currentUser.uid;
        const storageRef = firebase.storage().ref(`avatars/${userId}`);
        await storageRef.put(newAvatarFile);
        const avatarUrl = await storageRef.getDownloadURL();

        // Update user profile in Firestore
        await firebase.firestore().collection('users').doc(userId).update({
            avatarUrl: avatarUrl
        });

        // Update the avatar image in the UI
        document.getElementById('userAvatar').src = avatarUrl;
        hideAvatarEdit();
    } catch (error) {
        alert('Failed to update avatar: ' + error.message);
    }
}

// User profile popup functions
function showUserProfile(userId) {
    const popup = document.createElement('div');
    popup.className = 'user-popup';
    popup.id = `user-popup-${userId}`;
    document.body.appendChild(popup);

    // Fetch user data
    firebase.firestore().collection('users').doc(userId).get()
        .then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                popup.innerHTML = `
                    <img src="${userData.avatarUrl || ''}" class="avatar" style="width: 50px; height: 50px;">
                    <h4>${userData.username}</h4>
                    <p>${userData.status}</p>
                    ${userData.spotifyUrl ? `<a href="${userData.spotifyUrl}" target="_blank">Spotify Song</a>` : ''}
                `;
            }
        });

    // Position the popup near the clicked username
    const usernameElement = document.querySelector(`[data-user-id="${userId}"]`);
    if (usernameElement) {
        const rect = usernameElement.getBoundingClientRect();
        popup.style.top = `${rect.bottom + window.scrollY}px`;
        popup.style.left = `${rect.left + window.scrollX}px`;
        popup.style.display = 'block';
    }

    // Close popup when clicking outside
    document.addEventListener('click', function closePopup(e) {
        if (!popup.contains(e.target) && e.target !== usernameElement) {
            popup.remove();
            document.removeEventListener('click', closePopup);
        }
    });
}

// Update the loadUserProfile function to add click handlers
function loadUserProfile(userId) {
    firebase.firestore().collection('users').doc(userId).onSnapshot((doc) => {
        if (doc.exists) {
            const userData = doc.data();
            const userNameElement = document.getElementById('userName');
            userNameElement.textContent = userData.username;
            userNameElement.setAttribute('data-user-id', userId);
            userNameElement.onclick = () => showUserProfile(userId);
            
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
    const userId = firebase.auth().currentUser.uid;
    const newStatus = document.getElementById('statusInput').value;
    
    if (newStatus.trim()) {
        await firebase.firestore().collection('users').doc(userId).update({
            status: newStatus
        });
        document.getElementById('statusInput').value = '';
    }
}

async function updateSpotify() {
    const userId = firebase.auth().currentUser.uid;
    const newSpotifyUrl = document.getElementById('spotifyInput').value;
    
    if (newSpotifyUrl.trim()) {
        await firebase.firestore().collection('users').doc(userId).update({
            spotifyUrl: newSpotifyUrl
        });
        document.getElementById('spotifyInput').value = '';
    }
}

// Check auth state
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        showChat();
        loadUserProfile(user.uid);
    } else {
        document.getElementById('authContainer').style.display = 'block';
        document.getElementById('chatContainer').style.display = 'none';
        showLogin();
    }
}); 