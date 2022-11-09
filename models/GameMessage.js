class GameMessage {
    constructor(sender, message, remarks = null) {
        this.sender = sender
        this.message = message
        this.remarks = remarks
    }
  
    toString() {
        return JSON.stringify({
            sender: this.sender,
            message: this.message,
            remarks: this.remarks
        });
    }
  
    static parseFromSocket(msg) {
        const msgObj = JSON.parse(msg);
        return new GameMessage(msgObj.sender, msgObj.message, msgObj.remarks);
    }
}

export default GameMessage;