import asyncio
from unittest import result
import websockets
import json
from backend.managers.roomManager import RoomManager

room_manager = RoomManager()

async def handler(websocket):
    print("Client connected")

    try:
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
                    "roomId": room_id,
                    "playerId": player_id
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
                    response = {
                        "type": "unable-to-join",
                        "errorMessage": "Room does not exist"
                    }
                    await websocket.send(json.dumps(response))
                    continue

                room = room_manager.get_room(room_id)

                if room.game_started():
                    response = {
                        "type": "unable-to-join",
                        "errorMessage": "Game in progress"
                    }
                    await websocket.send(json.dumps(response))
                    continue
                if room.player_exists(player_id):
                    response = {
                        "type": "unable-to-join",
                        "errorMessage": "Username already taken in room"
                    }
                    await websocket.send(json.dumps(response))
                    continue
                if room.get_number_of_players() >= 5:
                    response = {
                        "type": "unable-to-join",
                        "errorMessage": "Room is full"
                    }
                    await websocket.send(json.dumps(response))
                    continue

                room.add_player(player_id, websocket)

                response = {
                    "type": "room-joined",
                    "roomId": room_id,
                    "playerId": player_id,
                    "playerList": room.get_players_ids()
                }
                await websocket.send(json.dumps(response))

                response = {
                    "type": "players-update",
                    "playerList": room.get_players_ids()
                }
                await room.broadcast(response)

            elif msg_type == "leave-room":
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
                if not room.player_exists(player_id):
                    await websocket.send("Player not found in room: " + player_id)
                    continue

                room = room_manager.get_room(room_id)
                room.remove_player(player_id)

                response = {
                    "type": "players-update",
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
                    "chat": game.get_chat(),
                    "problem": problem,
                    "testCycle": test_cycle
                }

                await room.broadcast(response)

                game.timer_task = asyncio.create_task(game.start_timer(30))

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

                await game.next_turn(player_id, code)

                response = {
                    "type": "next-turn",
                    "currentPlayer": game.players[game.current_player_idx].id,
                    "code": code
                }
                await room.broadcast(response)

            elif msg_type == "send-message":
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
                    message = data["message"]
                except KeyError:
                    await websocket.send("Missing message")
                    continue
                try:
                    timestamp = data["timestamp"]
                except KeyError:
                    await websocket.send("Missing timestamp")
                    continue

                if not room_manager.room_exists(room_id):
                    await websocket.send("No room found: " + room_id)
                    continue
                
                room = room_manager.get_room(room_id)
                game = room.get_game()
                game.addMessage(player_id, message, timestamp)

                response = {
                    "type": "chat-update",
                    "chat": game.get_chat()
                }
                await room.broadcast(response)
            
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

                results = game.run_tests(code)

                if results.returncode != 0:
                    outputs, passed = [results.stderr] * len(game.get_test_cycle()), [False] * len(game.get_test_cycle())
                    response = {
                        "type": "test-results",
                        "error": True,
                        "outputList": outputs,
                        "passedList": passed
                    }

                    await websocket.send(json.dumps(response))
                    continue

                outputs, passed, all_passed = game.parse_results(results)

                if not all_passed:
                    response = {
                        "type": "test-results",
                        "error": False,
                        "outputList": outputs,
                        "passedList": passed
                    }

                    await websocket.send(json.dumps(response))
                else:
                    await game.set_voting(player_id, code)
                    
                    response = {
                        "type": "start-vote",
                        "commits": game.get_commits(),
                        "votes": game.get_votes()
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

                if game.get_number_of_votes() == room.get_number_of_players():
                    await game.set_results()
            
            else:
                await websocket.send(f"Unknown message type: {msg_type}")
    except websockets.exceptions.ConnectionClosed:
        print("Client disconnected")


async def main():  
    async with websockets.serve(handler, "0.0.0.0", 8765):
        print("Running on ws://0.0.0.0:8765")
        await asyncio.Future() 


asyncio.run(main())