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
                const message = {
                    id: doc.id,
                    ...doc.data()
                };
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
    messageElement.id = `message-${message.id}`;
    
    const timestamp = message.timestamp ? new Date(message.timestamp.toDate()).toLocaleString() : '';
    
    // Check if the current user is DaddyPig
    const isDaddyPig = firebase.auth().currentUser && 
                      firebase.auth().currentUser.displayName === 'DaddyPig';
    
    messageElement.innerHTML = `
        <div class="message-header">
            <img src="${message.avatarUrl || ''}" class="avatar" alt="Avatar">
            <strong>${message.username}</strong>
            <span class="timestamp">${timestamp}</span>
            ${isDaddyPig ? `<button class="delete-message-btn" onclick="deleteMessage('${message.id}')">
                <i class="fas fa-trash"></i>
            </button>` : ''}
        </div>
        <div class="message-content" style="colour: ${message.textColour || '#000000'}">${message.text}</div>
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
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();

    if (message.startsWith('/colour ')) {
        const parts = message.split(' ');
        if (parts.length >= 2) {
            const colour = parts[1].trim();
            const remainingMessage = parts.slice(2).join(' ');
            
            // Validate colour format (hex, rgb, or colour name)
            if (isValidColour(colour)) {
                const user = firebase.auth().currentUser;
                if (!user) {
                    displaySystemMessage('You must be logged in to change text colour');
                    return;
                }

                try {
                    await firebase.firestore().collection('users').doc(user.uid).update({
                        textColour: colour
                    });
                    
                    displaySystemMessage(`Text colour changed to ${colour}`);
                    
                    // If there's a message after the colour command, send it with the new colour
                    if (remainingMessage) {
                        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
                        const userData = userDoc.data();
                        
                        await firebase.firestore().collection('messages').add({
                            text: remainingMessage,
                            userId: user.uid,
                            username: userData.username,
                            avatarUrl: userData.avatarUrl,
                            textColour: colour,
                            timestamp: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }
                } catch (error) {
                    console.error('Error updating text colour:', error);
                    displaySystemMessage('Error changing text colour: ' + error.message);
                }
            } else {
                displaySystemMessage('Invalid colour format. Use hex (#RRGGBB), rgb(r,g,b), or a valid colour name.');
            }
        } else {
            displaySystemMessage('Please specify a colour. Example: /colour red');
        }
        messageInput.value = '';
        return;
    }

    if (message) {
        try {
            const user = firebase.auth().currentUser;
            if (!user) throw new Error('You must be logged in to send messages');

            const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
            if (!userDoc.exists) throw new Error('User profile not found');

            const userData = userDoc.data();
            const textColour = userData.textColour || '#000000';

            const messageRef = await firebase.firestore().collection('messages').add({
                text: message,
                userId: user.uid,
                username: userData.username,
                avatarUrl: userData.avatarUrl,
                textColour: textColour,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            messageInput.value = '';
        } catch (error) {
            console.error('Error sending message:', error);
            displaySystemMessage('Error: ' + error.message);
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

// Helper function to validate colour
function isValidColour(colour) {
    const s = new Option().style;
    s.colour = colour;
    return s.colour !== '';
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

// Delete a message
async function deleteMessage(messageId) {
    if (!firebase.auth().currentUser || firebase.auth().currentUser.displayName !== 'DaddyPig') {
        displaySystemMessage('Only DaddyPig can delete messages');
        return;
    }

    try {
        await firebase.firestore().collection('messages').doc(messageId).delete();
        const messageElement = document.getElementById(`message-${messageId}`);
        if (messageElement) {
            messageElement.remove();
        }
    } catch (error) {
        console.error('Error deleting message:', error);
        displaySystemMessage('Error deleting message: ' + error.message);
    }
} 