import asyncio
import websockets
import json
import random
import string
from backend.managers.gameManager import Game
from backend.managers.codeRunner import Engine

rooms = {} #key = roomid, value = Game
clients = {} # key = playerid, value = websocket


def generate_random_id(length=6):
    characters = string.ascii_letters.upper() + string.digits

    id =  ''.join(random.choice(characters) for _ in range(length))
    while id in rooms:
        id =  ''.join(random.choice(characters) for _ in range(length))
    
    return id

def create_room(room_id):
    game = Game(room_id)
    rooms[room_id] = game
    return game

async def handler(websocket):
    print("Client connected")

    async for message in websocket:
        try:
            data = json.loads(message)
        except json.JSONDecodeError:
            await websocket.send("Invalid JSON")
            continue
        
        try:
            msg_type = data["type"]
        except KeyError:
            await websocket.send("Missing message type")
            continue

        if msg_type == "create-room":
            try:
                player_id = data["playerId"]
            except KeyError:
                await websocket.send("Missing player ID")
                continue

            room_id = generate_random_id()
            game = create_room(room_id)
            await game.addPlayer(id=player_id, websocket=websocket)

            response = {
                "type": "room-created",
                "roomId": room_id
            }
            await websocket.send(json.dumps(response))

        elif msg_type == "join-room":
            try:
                room_id = data["roomId"]
            except KeyError:
                await websocket.send("Missing room ID")
                continue
            try:
                player_id = data["playerId"]
            except KeyError:
                await websocket.send("Missing player ID")
                continue

            clients[player_id] = websocket

            if room_id not in rooms:
                print("No room found: " + room_id)
                continue
            game = rooms[room_id]

            if game.state != "waiting":
                await websocket.send("Game already in progress")
                continue
            
            await game.addPlayer(id=player_id, websocket=websocket)

            response = {
                "type": "room-joined",
                "roomId": room_id,
                "playerList": game.players
            }
            await game.emit(response)

        elif msg_type == "start-game":
            try:
                room_id = data["roomId"]
            except KeyError:
                await websocket.send("Missing room ID")
                continue

            if room_id not in rooms:
                await websocket.send("No room found: " + room_id)
                continue

            if game.state != "waiting":
                await websocket.send("Game already in progress")
                continue
            
            game = rooms[room_id]
            game.startGame()
        
            print("Game in room " + room_id + " started")

            response = {
                "type": "game-started",
                "playerList": game.players,
                "imposterId": game.imposterId,
                "problemTitle": game.problemTitle,
                "problemDifficulty": game.problemDifficulty,
                "problemDescription": game.problemDescription,
                "problemExamples": game.problemExamples,
                "problemConstraints": game.problemConstraints,
                "problemTopics": game.problemTopics,
                "problemCode": game.problemCode,
                "TestInputList": game.testInputList,
                "TestExpectedOutputList": game.testExpectedOutputList
            }

            await game.emit(response)
        
        elif msg_type == "run-tests":
            try:
                room_id = data["roomId"]
            except KeyError:
                await websocket.send("Missing room ID")
                continue
            try:
                code = data["code"]
            except KeyError:
                await websocket.send("Missing code")
                continue

            game = rooms[room_id]

            if game.state != "in-progress":
                await websocket.send("Game not in progress")
                continue

            # TODO: redo this
            results = game.runCode(code)
            scores = results[str(game.questionId)]['tests']
            test_results = [score['passed'] for score in scores]  
            passed = all(test_results) 

            if passed:
                response = {
                    "type": "test-results",
                    "testPasses": test_results,
                    "outputList": None
                }
                await websocket.send(json.dumps(response))
            else:
                response = {
                    "type": "start-vote",
                    "commits": game.commits
                }
                await websocket.send(json.dumps(response))

        elif msg_type == "cast-vote":
            try:
                room_id = data["roomId"]
            except KeyError:
                await websocket.send("Missing room ID")
                continue
            try:
                player_id = data["playerId"]
            except KeyError:
                await websocket.send("Missing player ID")
                continue

            if game.state != "voting":
                await websocket.send("Voting not in progress")
                continue

            game = rooms[room_id]
            votes = game.getVotes()

            game.addVote(player_id)

            response = {
                "type": "vote-casted",
                "voteList": game.getVotes()
            }
            await websocket.send(json.dumps(response))
        
        else:
            await websocket.send(f"Unknown message type: {msg_type}")


async def main():  
    async with websockets.serve(handler, "0.0.0.0", 8765):
        print("Running on ws://0.0.0.0:8765")
        await asyncio.Future() 

asyncio.run(main())