import { WebSocketServer } from 'ws';
import Player from "./models/Player.js";
import GameMessage from "./models/GameMessage.js";
import Game from "./models/Game.js";

const MAX_GAME = 100

const wss = new WebSocketServer({ port: 18080 });
const games = []
const players = []

const getRandomInt = (max) => {
    return Math.floor(Math.random() * max);
}

wss.on('connection', function connection(ws) {
    ws.send(new GameMessage("SERVER", "Connected").toString());
    if (games.length >= MAX_GAME) {
        ws.send(new GameMessage("SERVER", "ERROR", "Server is currently full"))
        ws.close();
    }

    ws.on('message', function message(rawmsg) {
        console.log('received: %s', rawmsg);

        let msgObj = GameMessage.parseFromSocket(rawmsg)

        switch (msgObj.message) {
            case "NEWGAME":
                {
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
                    game.AddPlayer(player2);
                    ws.send(new GameMessage("SERVER", "JOINGAME", "OK").toString());
                    break;
                }
            case "REQUESTSTART":
                {
                    const gameId = msgObj.remarks
                    const game = games.find(g => g.gameId == gameId) // DON'T use "===", it compares the true memory address
                    if (!game) {
                      ws.send(new GameMessage("SERVER", "ERROR", "Game ID not found").toString())
                      console.log('game id not found');
                      return
                    }
              
                    //let next20Blocks = [0,1,2,3,4,5,6].concat(Game.generateNextNBlocks(20))
                    let next20Blocks = Game.generateNextNBlocks(20)
                    for (let player of game.players) {
                      const msg = new GameMessage("SERVER", "GAMESTART", JSON.stringify(next20Blocks)).toString();
                      player.webSock.send(msg)
                      console.log('send: %s', msg);
                    }
                    break;
                }
            case "TICK":
                {
                    const player = players.find(p => p.playerId == msgObj.sender) // DON'T use "===", it compares the true memory address
                    if (!player) {
                      ws.send(new GameMessage("SERVER", "ERROR", "Player ID invalid").toString())
                      return
                    }
                    const gameId = player.gameId
                    const game = games.find(g => g.gameId == gameId) // DON'T use "===", it compares the true memory address
                    if (!game) {
                      ws.send(new GameMessage("SERVER", "ERROR", "Game ID not found").toString())
                      return
                    }
                    for (let player of game.players) {
                      // don't send to yourself
                      if (player.playerId != msgObj.sender) {
                        player.webSock.send(new GameMessage("RIVAL", "TICK", msgObj.remarks).toString())
                      }
                    }
                    break;
                }
            case "REQUESTBLOCK":
                {
                    const gameId = msgObj.remarks
                    const game = games.find(g => g.gameId == gameId) // DON'T use "===", it compares the true memory address
                    if (!game) {
                    ws.send(new GameMessage("SERVER", "ERROR", "Game ID not found").toString())
                    }
            
                    let next10Blocks = Game.generateNextNBlocks(10)
                    for (let player of game.players) {
                    player.webSock.send(new GameMessage("SERVER", "NEWBLOCK", JSON.stringify(next10Blocks)).toString())
                    }
                    break;
                }
        }
  });


ws.on('close', function close() {
    const gameId = ws.gameId;
    const game = games.find(g => g.gameId == gameId); // DON'T use "===", it compares the true memory address
    //console.log(ws.gameId)
    if (!game) {
        return;
    }
    //console.log(game)
    for (let player of game.players) {
        if (player.webSock !== ws) {
            player.webSock.send(new GameMessage("SERVER", "GAMEOVER", "WON").toString());
            player.webSock.close();
        }
    }

    const index = games.indexOf(gameId);
    if (index > -1) {
        games.splice(index, 1);
    }

})



});

wss.broadcast = function broadcast(msg) {
    console.log(msg);
    wss.clients.forEach(function each(client) {
        client.send(msg);
    });
};