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
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const userId = userCredential.user.uid;

        let avatarUrl = '';
        if (avatarFile) {
            const storageRef = firebase.storage().ref();
            const avatarRef = storageRef.child(`avatars/${userId}`);
            await avatarRef.put(avatarFile);
            avatarUrl = await avatarRef.getDownloadURL();
        }

        const userProfile = {
            username: username,
            email: email,
            avatarUrl: avatarUrl,
            status: 'Just joined Farm Chat!',
            spotifyUrl: '',
            textColour: '#000000',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await firebase.firestore().collection('users').doc(userId).set(userProfile);
        document.getElementById('authContainer').style.display = 'none';
        document.getElementById('chatContainer').style.display = 'grid';
        loadUserProfile(userId);
    } catch (error) {
        console.error('Registration error:', error);
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
        // Check if file is an image
        if (!newAvatarFile.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Check file size (limit to 1MB)
        if (newAvatarFile.size > 1024 * 1024) {
            alert('Image size should be less than 1MB');
            return;
        }

        // Convert image to base64
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64Image = e.target.result;
            const userId = firebase.auth().currentUser.uid;

            // Update user profile in Firestore with base64 image
            await firebase.firestore().collection('users').doc(userId).update({
                avatarUrl: base64Image
            });

            // Update the avatar image in the UI
            document.getElementById('userAvatar').src = base64Image;
            hideAvatarEdit();
        };
        reader.readAsDataURL(newAvatarFile);
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

// Update the loadUserProfile function to remove color picker reference
function loadUserProfile(userId) {
    firebase.firestore().collection('users').doc(userId).onSnapshot((doc) => {
        if (doc.exists) {
            const userData = doc.data();
            document.getElementById('userName').textContent = userData.username;
            document.getElementById('userStatus').textContent = userData.status;
            document.getElementById('userSpotify').href = userData.spotifyUrl || '#';
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

// Sign out function
async function signOut() {
    try {
        await firebase.auth().signOut();
        // Hide chat and show auth container
        document.getElementById('chatContainer').style.display = 'none';
        document.getElementById('authContainer').style.display = 'block';
        // Clear any existing messages
        document.getElementById('messages').innerHTML = '';
        document.getElementById('motdContainer').innerHTML = '';
        // Reset forms
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('email').value = '';
        document.getElementById('password').value = '';
    } catch (error) {
        console.error('Error signing out:', error);
        alert('Error signing out: ' + error.message);
    }
}

// Function to display user list
function setupUserList() {
    firebase.firestore().collection('users')
        .onSnapshot((snapshot) => {
            const usersList = document.getElementById('usersList');
            usersList.innerHTML = '';
            
            snapshot.docs.forEach((doc) => {
                const userData = doc.data();
                const userElement = document.createElement('div');
                userElement.className = 'user-list-item';
                userElement.innerHTML = `
                    <img src="${userData.avatarUrl || ''}" class="avatar" alt="Avatar">
                    <div class="user-info">
                        <div class="username">${userData.username}</div>
                        <div class="status">${userData.status}</div>
                        ${userData.spotifyUrl ? `<a href="${userData.spotifyUrl}" class="spotify-link" target="_blank">Spotify Song</a>` : ''}
                    </div>
                `;
                usersList.appendChild(userElement);
            });
        });
}

// Update the auth state changed handler
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        // User is signed in
        document.getElementById('authContainer').style.display = 'none';
        document.getElementById('chatContainer').style.display = 'grid';
        loadUserProfile(user.uid);
        setupUserList();
    } else {
        // User is signed out
        document.getElementById('authContainer').style.display = 'block';
        document.getElementById('chatContainer').style.display = 'none';
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
    }
});

// Update user's text color
async function updateTextColor(color) {
    const userId = firebase.auth().currentUser.uid;
    try {
        await firebase.firestore().collection('users').doc(userId).update({
            textColour: color
        });
    } catch (error) {
        console.error('Error updating text color:', error);
    }
} 