import { WebSocketServer } from 'ws';
import Player from "./models/Player.js";
import GameMessage from "./models/GameMessage.js";

const MAX_GAME = 100

const wss = new WebSocketServer({ port: 18080 });
const games = []
const players = []

const getRandomInt = (max) => {
    return Math.floor(Math.random() * max);
}

class Game {
    constructor() {
        this.gameId = Game.generateGameId();
        this.blockList = Game.generateList();
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
  
    static generateList() {
        let list = [];
        for (let i = 0; i < 10 ; i++) {
            list.push(Math.floor(Math.random() * 7));
        }
        return list;
    }
}

wss.on('connection', function connection(ws) {
    ws.send(new GameMessage("SERVER", "Connected", ws._socket.remotePort).toString());
    if (games.length >= MAX_GAME) {
        ws.send(new GameMessage("SERVER", "ERROR", "Server is currently full"))
        ws.close();
    }

    ws.on('message', function message(rawmsg) {
        console.log('received: %s', rawmsg);

        let msgObj = GameMessage.parseFromSocket(rawmsg)

        switch (msgObj.message) {
            case "GETID":
                {
                    const msg = new GameMessage("SERVER", "ROOM", JSON.stringify({
                        "games": JSON.stringify(
                            games
                            .filter(i => i.player2 == null)
                            .map(i => { return ({ gameId: i.gameId, player: i.player1.playerId})}))
                    })).toString();
                    ws.send(msg);
                    break;
                }
            case "NEWGAME":
                {
                    if (games.find(i => i.player1.webSock._socket.remotePort == ws._socket.remotePort)) {
                        return;
                    }
                    const newGame = new Game();
                    ws.gameId = newGame.gameId;
                    const player1 = new Player(msgObj.sender, ws);
                    newGame.player1 = player1;
                    players.push(player1);
                    games.push(newGame);
                    const msg = new GameMessage("SERVER", "GAMEID", newGame.gameId).toString();
                    console.log('send: %s', msg);
                    ws.send(msg);
                    break;
                }
            case "JOINGAME":
                {
                    const gameId = msgObj.remarks;
                    const game = games.find(g => g.gameId == gameId); // DON'T use "===", it compares the true memory address
                    if (!game) {
                        ws.send(new GameMessage("SERVER", "ERROR", "Game ID not found").toString());
                        return;
                    }
                    ws.gameId = game.gameId;
                    const player2 = new Player(msgObj.sender, ws);
                    players.push(player2);
                    game.player2 = player2;
                    ws.send(new GameMessage("SERVER", "JOINGAME", "OK").toString());

                    game.player1.webSock.send(new GameMessage("SERVER", "START", `${game.blockList[0]},${game.blockList[1]},${game.blockList[2]}`).toString());
                    game.player2.webSock.send(new GameMessage("SERVER", "START", `${game.blockList[0]},${game.blockList[1]},${game.blockList[2]}`).toString());
                    break;
                }
            case "LOSE":
                {
                    const game = games.find(g => g.player1.playerId == ws._socket.remotePort || g.player2.playerId == ws._socket.remotePort);
                    if (game.player1.playerId == ws._socket.remotePort) {
                        game.player2.webSock.send(new GameMessage("SERVER", "WIN", "").toString());
                    } else {
                        game.player1.webSock.send(new GameMessage("SERVER", "WIN", "").toString());
                    }
                    
                    const gamePlayers = players.filter(p => p.playerId == game.player1.playerId || p.playerId == game.player2.playerId);
                    for (let i in gamePlayers) {
                        let index = players.indexOf(gamePlayers[i]);
                        players.splice(index, 1);
                    }
                    
                    let index = games.indexOf(game);
                    if (index > -1) {
                        games.splice(index, 1);
                    }
                    break;
                }
            case "REQUESTBLOCK":
                {
                    const sequence = msgObj.remarks;
                    console.log(sequence);
                    const game = games.find(g => g.player1.playerId == ws._socket.remotePort || g.player2.playerId == ws._socket.remotePort);
                    if (!game) {
                        ws.send(new GameMessage("SERVER", "ERROR", "Game ID not found").toString());
                        return;
                    }
                    
                    if (game.blockList.length <= sequence + 5) {
                        game.blockList.push(Math.floor(Math.random() * 7));
                    }
                    ws.send(new GameMessage("SERVER", "NEWBLOCK", String(game.blockList[sequence + 1])).toString());
                    break;
                }
            case "REPORT":
                {
                    const gridList = msgObj.remarks;
                    const game = games.find(g => g.player1.playerId == ws._socket.remotePort || g.player2.playerId == ws._socket.remotePort);
                    if (!game) {
                        ws.send(new GameMessage("SERVER", "ERROR", "Game ID not found").toString());
                        return;
                    }
                    if (game.player1.playerId == ws._socket.remotePort) {
                        game.player2.webSock.send(new GameMessage("SERVER", "RIVALGRID", gridList).toString());
                    } else {
                        game.player1.webSock.send(new GameMessage("SERVER", "RIVALGRID", gridList).toString());
                    }
                    break;
                }
        }
    });

    ws.on('close', function close() {
        const game = games.find(g => g.player1.playerId == ws._socket.remotePort || (g.player2 && g.player2.playerId == ws._socket.remotePort));
        //console.log(ws.gameId)
        if (!game) {
            return;
        }
        //console.log(game)
        // if (game.player1.webSock !== ws) {
        //     game.player1.webSock.send(new GameMessage("SERVER", "GAMEOVER", "WON").toString());
        //     game.player1.webSock.close();
        // }
        // if (game.player2.webSock !== ws) {
        //     game.player2.webSock.send(new GameMessage("SERVER", "GAMEOVER", "WON").toString());
        //     game.player2.webSock.close();
        // }

        const index = games.indexOf(game);
        if (index > -1) {
            games.splice(index, 1);
        }
    });
});

wss.broadcast = function broadcast(msg) {
    console.log(msg);
    wss.clients.forEach(function each(client) {
        client.send(msg);
    });
};