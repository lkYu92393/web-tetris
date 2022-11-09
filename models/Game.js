const MAX_BLOCK_TYPES = 7;
const MAX_GAME = 100;

const getRandomInt = (max) => {
    return Math.floor(Math.random() * max);
}

class Game {
    constructor() {
        this.gameId = Game.generateGameId()
        this.player1 = null;
        this.player2 = null;
    }
  
    static generateGameId() {
        while (true) {
            let gameId = getRandomInt(3 * MAX_GAME);
            if (!games.includes(gameId)) {
                return gameId;
            }
        }
    }
  
    static generateNextNBlocks(N) {
        let nextN = []
        for (let i = 0; i < N; ++i) {
            nextN.push(getRandomInt(MAX_BLOCK_TYPES))
        }
        return nextN;
    }
  
    AddPlayer(player) {
        player.gameId = this.gameId
        this.players.push(player)
    }
}

export default Game;