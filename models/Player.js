class Player {
    constructor(playerId, webSock) {
        this.playerId = playerId;
        this.webSock = webSock;
    }
  
    setGameId(gameId) {
        this.gameId = gameId;
    }
}

export default Player;