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
            <strong>${message.username}</strong>
            <span class="timestamp">${timestamp}</span>
        </div>
        <div class="message-content">${message.text}</div>
    `;
    
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

// Send a message
async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const text = messageInput.value.trim();
    
    if (text && firebase.auth().currentUser) {
        const userId = firebase.auth().currentUser.uid;
        
        // Check rate limit
        if (!messageLimiter.canSendMessage(userId)) {
            const timeLeft = messageLimiter.getTimeUntilNextMessage(userId);
            showRateLimitMessage(timeLeft);
            return;
        }
        
        const userDoc = await firebase.firestore().collection('users').doc(userId).get();
        const userData = userDoc.data();
        
        try {
            await firebase.firestore().collection('messages').add({
                userId: userId,
                username: userData.username,
                avatarUrl: userData.avatarUrl,
                text: text,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            messageInput.value = '';
        } catch (error) {
            console.error('Error sending message:', error);
            // Show error message to user
            const messagesContainer = document.getElementById('messages');
            const errorMessage = document.createElement('div');
            errorMessage.className = 'message error';
            errorMessage.innerHTML = `
                <div class="message-content">
                    Error sending message. Please try again.
                </div>
            `;
            messagesContainer.appendChild(errorMessage);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
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