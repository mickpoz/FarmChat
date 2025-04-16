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

// Function to scroll to the bottom of the messages container
function scrollToBottom() {
    const messagesContainer = document.getElementById('messages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Function to check if user is near the bottom of the chat
function isNearBottom() {
    const messagesContainer = document.getElementById('messages');
    const threshold = 100; // pixels from bottom
    return messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < threshold;
}

// Display a message
function displayMessage(message) {
    const messagesContainer = document.getElementById('messages');
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    
    const timestamp = message.timestamp ? new Date(message.timestamp.toDate()).toLocaleString() : '';
    
    messageElement.innerHTML = `
        <div class="message-header">
            <img src="${message.avatarUrl || ''}" class="avatar" alt="Avatar">
            <strong>${message.username}</strong>
            <span class="timestamp">${timestamp}</span>
        </div>
        <div class="message-content" style="color: ${message.textColor || '#000000'}">${message.text}</div>
    `;

    messagesContainer.appendChild(messageElement);
    
    // Auto-scroll if user is near the bottom
    if (isNearBottom()) {
        scrollToBottom();
    }
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
function setupMessageOfTheDayListener() {
    firebase.firestore().collection('settings').doc('messageOfTheDay')
        .onSnapshot(async (doc) => {
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
            } else {
                // Clear MOTD if it doesn't exist
                document.getElementById('motdContainer').innerHTML = '';
                messageOfTheDay = null;
            }
        });
}

// Function to display Message of the Day
function displayMessageOfTheDay() {
    if (!messageOfTheDay) return;

    const motdContainer = document.getElementById('motdContainer');
    motdContainer.innerHTML = `
        <div class="message motd">
            <div class="message-header">
                <img src="${messageOfTheDay.avatarUrl || ''}" class="avatar">
                <strong>${messageOfTheDay.username}</strong>
                <span class="timestamp">Message of the Day</span>
            </div>
            <div class="message-content">${messageOfTheDay.message}</div>
        </div>
    `;
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

    if (message.startsWith('/color ')) {
        const color = message.substring(7).trim();
        // Validate color format (hex, rgb, or color name)
        if (isValidColor(color)) {
            await updateTextColor(color);
            messageInput.value = '';
            return;
        } else {
            displaySystemMessage('Invalid color format. Use hex (#RRGGBB), rgb(r,g,b), or a valid color name.');
            return;
        }
    }

    if (message) {
        try {
            const user = firebase.auth().currentUser;
            if (!user) {
                throw new Error('You must be logged in to send messages');
            }

            const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
            if (!userDoc.exists) {
                throw new Error('User profile not found. Please try logging out and back in.');
            }

            const userData = userDoc.data();
            if (!userData.username) {
                throw new Error('Username not found in profile. Please try logging out and back in.');
            }

            const textColor = userData.textColor || '#000000';

            await firebase.firestore().collection('messages').add({
                text: message,
                userId: user.uid,
                username: userData.username,
                avatarUrl: userData.avatarUrl,
                textColor: textColor,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            messageInput.value = '';
            rateLimiter.recordMessage();
        } catch (error) {
            console.error('Error sending message:', error);
            // Show error message to user
            const messagesContainer = document.getElementById('messages');
            const errorMessage = document.createElement('div');
            errorMessage.className = 'message error';
            errorMessage.innerHTML = `
                <div class="message-content">
                    Error: ${error.message}
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
        setupMessageOfTheDayListener();
    }
});

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

// Add scroll event listener to messages container
document.addEventListener('DOMContentLoaded', function() {
    const messagesContainer = document.getElementById('messages');
    let autoScroll = true;

    messagesContainer.addEventListener('scroll', function() {
        // If user manually scrolls up, disable auto-scroll
        if (!isNearBottom()) {
            autoScroll = false;
        }
        // If user scrolls to bottom, re-enable auto-scroll
        else {
            autoScroll = true;
        }
    });

    // Scroll to bottom when new messages arrive
    const observer = new MutationObserver(function() {
        if (autoScroll) {
            scrollToBottom();
        }
    });

    observer.observe(messagesContainer, { childList: true, subtree: true });
});

// Helper function to validate color
function isValidColor(color) {
    const s = new Option().style;
    s.color = color;
    return s.color !== '';
}

// Display system message
function displaySystemMessage(message) {
    const messagesContainer = document.getElementById('messages');
    const messageElement = document.createElement('div');
    messageElement.className = 'message system';
    messageElement.innerHTML = `<div class="message-content">${message}</div>`;
    messagesContainer.appendChild(messageElement);
    
    if (isNearBottom()) {
        scrollToBottom();
    }
} 