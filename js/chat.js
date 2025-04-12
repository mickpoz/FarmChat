// Initialize rate limiter
const rateLimiter = new RateLimiter(10, 60000); // 10 messages per 60 seconds

// Load messages
function loadMessages() {
    firebase.firestore().collection('messages')
        .orderBy('timestamp', 'desc')
        .limit(50)
        .onSnapshot((snapshot) => {
            const messagesContainer = document.getElementById('messages');
            messagesContainer.innerHTML = '';
            
            snapshot.docs.reverse().forEach((doc) => {
                const message = doc.data();
                displayMessage(message);
            });
            
            // Scroll to bottom
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });
}

// Display a message
function displayMessage(message) {
    const messagesContainer = document.getElementById('messages');
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    
    const timestamp = message.timestamp ? new Date(message.timestamp.toDate()).toLocaleString() : '';
    
    messageElement.innerHTML = `
        <div class="message-header">
            <img src="${message.avatarUrl || 'default-avatar.png'}" class="avatar" alt="Avatar">
            <span class="username" data-user-id="${message.userId}">${message.username}</span>
            <span class="timestamp">${timestamp}</span>
        </div>
        <div class="message-content">${message.text}</div>
    `;
    
    // Add click handler for username
    const usernameElement = messageElement.querySelector('.username');
    usernameElement.onclick = () => showUserProfile(message.userId);

    messagesContainer.appendChild(messageElement);
}

// Show rate limit message
function showRateLimitMessage(timeLeft) {
    const messagesContainer = document.getElementById('messages');
    const rateLimitMessage = document.createElement('div');
    rateLimitMessage.className = 'message rate-limit';
    rateLimitMessage.innerHTML = `
        <div class="message-content">
            Please wait ${Math.ceil(timeLeft / 1000)} seconds before sending another message.
        </div>
    `;
    messagesContainer.appendChild(rateLimitMessage);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Remove the message after 3 seconds
    setTimeout(() => {
        rateLimitMessage.remove();
    }, 3000);
}

// Message of the Day
let messageOfTheDay = null;

// Function to get Message of the Day
async function getMessageOfTheDay() {
    try {
        const doc = await firebase.firestore().collection('settings').doc('messageOfTheDay').get();
        if (doc.exists) {
            const motdData = doc.data();
            // Fetch user data for the MOTD
            const userDoc = await firebase.firestore().collection('users').doc(motdData.userId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                messageOfTheDay = {
                    ...motdData,
                    username: userData.username,
                    avatarUrl: userData.avatarUrl
                };
                displayMessageOfTheDay();
            }
        }
    } catch (error) {
        console.error('Error getting message of the day:', error);
    }
}

// Function to set Message of the Day
async function setMessageOfTheDay(message) {
    try {
        const user = firebase.auth().currentUser;
        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
        const userData = userDoc.data();

        await firebase.firestore().collection('settings').doc('messageOfTheDay').set({
            message: message,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            userId: user.uid,
            username: userData.username,
            avatarUrl: userData.avatarUrl
        });

        // Add a notification message to the chat
        const messagesContainer = document.getElementById('messages');
        const notification = document.createElement('div');
        notification.className = 'message notification';
        notification.innerHTML = `
            <div class="message-content">
                ${userData.username} has set a new Message of the Day: "${message}"
            </div>
        `;
        messagesContainer.appendChild(notification);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Remove the notification after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);

    } catch (error) {
        console.error('Error setting message of the day:', error);
    }
}

// Function to display Message of the Day
function displayMessageOfTheDay() {
    if (!messageOfTheDay) return;

    const motdContainer = document.createElement('div');
    motdContainer.className = 'message motd';
    motdContainer.innerHTML = `
        <div class="message-header">
            <img src="${messageOfTheDay.avatarUrl || ''}" class="avatar">
            <span class="username" data-user-id="${messageOfTheDay.userId}">${messageOfTheDay.username}</span>
            <span class="timestamp">Message of the Day</span>
        </div>
        <div class="message-content">${messageOfTheDay.message}</div>
    `;

    const messagesContainer = document.getElementById('messages');
    if (messagesContainer.firstChild) {
        messagesContainer.insertBefore(motdContainer, messagesContainer.firstChild);
    } else {
        messagesContainer.appendChild(motdContainer);
    }

    // Add click handler for username
    const usernameElement = motdContainer.querySelector('.username');
    usernameElement.onclick = () => showUserProfile(messageOfTheDay.userId);
}

// Send a message
async function sendMessage() {
    if (!rateLimiter.canSendMessage()) {
        showRateLimitMessage();
        return;
    }

    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (message.startsWith('/motd ')) {
        const motdMessage = message.substring(6);
        await setMessageOfTheDay(motdMessage);
        messageInput.value = '';
        return;
    }

    if (message) {
        try {
            const user = firebase.auth().currentUser;
            const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
            const userData = userDoc.data();

            await firebase.firestore().collection('messages').add({
                text: message,
                userId: user.uid,
                username: userData.username,
                avatarUrl: userData.avatarUrl,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            messageInput.value = '';
            rateLimiter.recordMessage();
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }
}

// Handle Enter key for sending messages
document.getElementById('messageInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Initialize chat when user is authenticated
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        loadMessages();
    }
});

// Initialize Message of the Day
getMessageOfTheDay(); 