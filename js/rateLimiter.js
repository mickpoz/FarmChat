class RateLimiter {
    constructor(limit, interval) {
        this.limit = limit; // Number of messages allowed
        this.interval = interval; // Time interval in milliseconds
        this.messages = new Map(); // Store message timestamps
    }

    canSendMessage(userId) {
        const now = Date.now();
        const userMessages = this.messages.get(userId) || [];
        
        // Remove messages older than the interval
        const recentMessages = userMessages.filter(time => now - time < this.interval);
        
        if (recentMessages.length >= this.limit) {
            return false;
        }
        
        recentMessages.push(now);
        this.messages.set(userId, recentMessages);
        return true;
    }

    getTimeUntilNextMessage(userId) {
        const now = Date.now();
        const userMessages = this.messages.get(userId) || [];
        const recentMessages = userMessages.filter(time => now - time < this.interval);
        
        if (recentMessages.length < this.limit) {
            return 0;
        }
        
        const oldestMessage = recentMessages[0];
        return Math.max(0, this.interval - (now - oldestMessage));
    }
}

// Create a rate limiter instance (e.g., 10 messages per 60 seconds)
const messageLimiter = new RateLimiter(10, 60000);

// Export the rate limiter
window.messageLimiter = messageLimiter; 