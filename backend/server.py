import asyncio
import websockets
import json
from backend.managers.roomManager import RoomManager

room_manager = RoomManager()

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

            room_id = room_manager.create_room()
            room = room_manager.get_room(room_id)
            room.add_player(player_id, websocket)

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

            if not room_manager.room_exists(room_id):
                await websocket.send("No room found: " + room_id)
                continue

            room = room_manager.get_room(room_id)
            room.add_player(player_id, websocket)

            response = {
                "type": "room-joined",
                "roomId": room_id,
                "playerList": room.get_players_ids()
            }
            await room.broadcast(response)

        elif msg_type == "start-game":
            try:
                room_id = data["roomId"]
            except KeyError:
                await websocket.send("Missing room ID")
                continue

            if not room_manager.room_exists(room_id):
                await websocket.send("No room found: " + room_id)
                continue
            
            room = room_manager.get_room(room_id)

            if room.game_started():
                await websocket.send("Game already started in room: " + room_id)
                continue

            game = room.create_game()
            problem = game.get_problem()
            test_cycle = game.get_test_cycle()
        
            print("Game in room " + room_id + " started")

            response = {
                "type": "game-started",
                "playerList": game.get_player_ids(),
                "imposterId": game.get_imposter_id(),
                "problem": json.dumps(problem),
                "testCycle": json.dumps(test_cycle)
            }

            await room.broadcast(response)

            game.timer_task = asyncio.create_task(game.start_timer(120))
        
        elif msg_type == "run-test-cycle":
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
            try:
                code = data["code"]
            except KeyError:
                await websocket.send("Missing code")
                continue

            room = room_manager.get_room(room_id)
            game = room.get_game()

            if game.state != "coding":
                await websocket.send("Coding not in progress")
                continue

            outputs, passed, all_passed = game.run_tests(code)

            if not all_passed:
                response = {
                    "type": "test-results",
                    "outputList": outputs,
                    "passedList": passed
                }

                await websocket.send(json.dumps(response))
            else:
                game.set_voting(player_id, code)
                
                response = {
                    "type": "start-vote",
                    "commits": game.get_commits()
                }

                await room.broadcast(response)

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

            room = room_manager.get_room(room_id)
            game = room.get_game()

            if game.state != "voting":
                await websocket.send("Voting not in progress")
                continue

            game.cast_vote(player_id)

            response = {
                "type": "vote-casted",
                "voteList": game.get_votes()
            }
            await room.broadcast(response)

        elif msg_type == "next-turn":
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
            try:
                code = data["code"]
            except KeyError:
                await websocket.send("Missing code")
                continue

            room = room_manager.get_room(room_id)
            game = room.get_game()

            if game.state != "coding":
                await websocket.send("Coding not in progress")
                continue

            game.next_turn(player_id, code)

            response = {
                "type": "switch-current-player",
                "currentPlayer": game.players[game.current_player_idx].id,
                "code": code
            }
            await room.broadcast(response)

        elif msg_type == "test":
            room_id = room_manager.create_room()
            print("Created room with ID: " + room_id)
            room = room_manager.get_room(room_id)
            room.add_player("james", websocket)
            room.add_player("abdou", websocket)
            print("Added players: " + ", ".join(room.get_players_ids()))
            game = room.create_game()
            game.set_voting("james", "print('hello world')")
        
        else:
            await websocket.send(f"Unknown message type: {msg_type}")


async def main():  
    async with websockets.serve(handler, "0.0.0.0", 8765):
        print("Running on ws://0.0.0.0:8765")
        await asyncio.Future() 


asyncio.run(main())