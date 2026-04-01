import asyncio
import websockets
import json
import os
from backend.managers.roomManager import RoomManager
from backend.models.game import GameState

room_manager = RoomManager()

def _get_min_players_to_start() -> int:
    raw = os.getenv("MIN_PLAYERS_TO_START", "3")
    try:
        value = int(raw)
    except ValueError:
        value = 3
    return max(1, value)

MIN_PLAYERS_TO_START = _get_min_players_to_start()

async def handle_disconnect(room_id, player_id):
    if (
        room_id is not None
        and player_id is not None
        and room_manager.room_exists(room_id)
    ):
        room = room_manager.get_room(room_id)
        if room.player_exists(player_id):
            if room.game_started():
                game = room.get_game()
                await game.handle_player_disconnect(player_id)
            else:
                room.remove_player(player_id)

            if room.get_number_of_players() == 0:
                room_manager.remove_room(room_id)
                print("Deleted empty room: " + room_id)
            else:
                response = {
                    "type": "room-players-update",
                    "playerList": room.get_players_ids()
                }
                await room.broadcast(response)
                if room.game_started():
                    game = room.get_game()
                    response = {
                        "type": "game-players-update",
                        "playerList": game.get_player_ids(),
                        "playerId": game.players[game.current_player_idx].id,
                        "chat": game.get_chat()
                    }
                    await room.broadcast(response)

async def handler(websocket):
    print("Client connected")
    connected_room_id = None
    connected_player_id = None

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
                connected_room_id = room_id
                connected_player_id = player_id

                response = {
                    "type": "room-created",
                    "roomId": room_id,
                    "playerId": player_id
                }
                await websocket.send(json.dumps(response))

                print("Room created:", room_id)

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
                connected_room_id = room_id
                connected_player_id = player_id

                response = {
                    "type": "room-joined",
                    "roomId": room_id,
                    "playerId": player_id,
                    "playerList": room.get_players_ids()
                }
                await websocket.send(json.dumps(response))

                response = {
                    "type": "room-players-update",
                    "playerList": room.get_players_ids()
                }
                await room.broadcast(response)

            elif msg_type == "leave":
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

                await handle_disconnect(room_id, player_id)

                connected_room_id = None
                connected_player_id = None

            elif msg_type == "update-config":
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

                if  connected_player_id != room.get_players_ids()[0]:
                    await websocket.send("Only the host can update the config")
                    continue

                config = room.config
                if "difficultyRange" in data:
                    config.set_difficulty_range(data["difficultyRange"])
                
                if "masterTimer" in data:
                    try:
                        mt = int(data["masterTimer"])
                        if mt > 0:
                            config.master_timer = mt
                    except ValueError:
                        pass

                response = {
                    "type": "config-updated",
                    "difficultyRange": config.difficulty_range,
                    "masterTimer": config.master_timer
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

                if room.get_number_of_players() < MIN_PLAYERS_TO_START:
                    await websocket.send(json.dumps({
                        "type": "not-enough-players",
                        "minPlayers": MIN_PLAYERS_TO_START
                    }))
                    continue

                if room.game_started():
                    await websocket.send("Game already started in room: " + room_id)
                    continue

                game = room.create_game()
                problem = game.get_problem()
                test_cases = game.get_test_cases()

                response = {
                    "type": "game-started",
                    "playerList": game.get_player_ids(),
                    "imposterId": game.get_imposter_id(),
                    "chat": game.get_chat(),
                    "problem": problem,
                    "masterTimer": room.config.master_timer,
                    "testCases": test_cases
                }

                await room.broadcast(response)
        
            elif msg_type == "set-ready":
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

                if not room.game_started():
                    await websocket.send("No game running in room")
                    continue

                game = room.get_game()

                if game.state != GameState.BRIEFING:
                    await websocket.send("Not in briefing phase")
                    continue
                
                if not room.player_exists(player_id):
                    await websocket.send("Player not found in room: " + player_id)
                    continue

                game.set_ready(player_id)

                response = {
                    "type": "player-ready",
                    "readyCount": game.get_number_of_ready()
                }

                await room.broadcast(response)

                if game.get_number_of_ready() == room.get_number_of_players():
                    await room.broadcast({
                        "type": "briefing-over",
                    })

                    await game.set_coding()

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

                if not room_manager.room_exists(room_id):
                    await websocket.send("No room found: " + room_id)
                    continue

                room = room_manager.get_room(room_id)
                if not room.game_started():
                    await websocket.send("Game not in progress")
                    continue

                game = room.get_game()

                if game.state != GameState.CODING:
                    await websocket.send("Coding not in progress")
                    continue

                await game.set_next_turn(player_id, code)
                time_manager = game.get_time_manager()

                if time_manager.num_rounds > 0:
                    response = {
                        "type": "next-turn",
                        "playerId": game.players[game.current_player_idx].id,
                        "code": code,
                        "chat": game.get_chat()
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
                if not room.game_started():
                    await websocket.send("Game not in progress")
                    continue

                game = room.get_game()
                game.add_message(player_id, message, timestamp)

                response = {
                    "type": "chat-update",
                    "chat": game.get_chat()
                }
                await room.broadcast(response)

            elif msg_type == "new-code":
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

                if not room_manager.room_exists(room_id):
                    await websocket.send("No room found: " + room_id)
                    continue
                
                room = room_manager.get_room(room_id)
                if not room.game_started():
                    await websocket.send("Game not in progress")
                    continue

                response = {
                    "type": "new-code",
                    "code": code
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

                if not room_manager.room_exists(room_id):
                    await websocket.send("No room found: " + room_id)
                    continue

                room = room_manager.get_room(room_id)
                if not room.game_started():
                    await websocket.send("Game not in progress")
                    continue

                game = room.get_game()

                if game.state != "coding":
                    await websocket.send("Coding not in progress")
                    continue

                results = game.run_tests(code)              
                if results.returncode != 0:
                    outputs, passed = [results.stderr] * len(game.get_test_cases()), [False] * len(game.get_test_cases())
                    response = {
                        "type": "test-results",
                        "error": True,
                        "outputList": outputs,
                        "passedList": passed
                    }

                    await websocket.send(json.dumps(response))
                    continue

                outputs, passed, all_passed = game.parse_results(results)

                response = {
                    "type": "test-results",
                    "error": False,
                    "outputList": outputs,
                    "passedList": passed
                }

                await websocket.send(json.dumps(response))
                
                if all_passed:
                    game.add_commit(player_id, code)
                    await game.set_voting()
                    
                    response = {
                        "type": "coding-over",
                        "commits": game.get_commits(),
                        "votes": game.get_votes(),
                        "chat": game.get_chat()
                    }

                    await room.broadcast(response)

            elif msg_type == "cast-vote":
                try:
                    room_id = data["roomId"]
                except KeyError:
                    await websocket.send("Missing room ID")
                    continue
                try:
                    voter_id = data["voterId"]
                except KeyError:
                    await websocket.send("Missing voter ID")
                    continue
                try:
                    voted_id = data["votedId"]
                except KeyError:
                    await websocket.send("Missing voted ID")
                    continue

                if not room_manager.room_exists(room_id):
                    await websocket.send("No room found: " + room_id)
                    continue

                room = room_manager.get_room(room_id)
                if not room.game_started():
                    await websocket.send("Game not in progress")
                    continue

                game = room.get_game()

                if game.state != "voting":
                    await websocket.send("Voting not in progress")
                    continue

                game.cast_vote(voter_id, voted_id)

                response = {
                    "type": "vote-casted",
                    "voteList": game.get_votes(),
                    "chat": game.get_chat()
                }
                await room.broadcast(response)

                if game.get_number_of_votes() == room.get_number_of_players():
                    await game.set_results()

                    response = {
                        "type": "voting-over",
                        "voted": game.get_voted(),
                        "votedCorrectly": game.get_imposter_id() in game.get_voted()
                    }
                    await room.broadcast(response)

            elif msg_type == "get-health":
                
                response = {
                    "type": "health",
                    "rooms": room_manager.get_rooms()
                }
                await websocket.send(json.dumps(response))
            
            else:
                await websocket.send(f"Unknown message type: {msg_type}")
    except websockets.exceptions.ConnectionClosed:
        print("Client disconnected")
    finally:
        await handle_disconnect(connected_room_id, connected_player_id)

async def main():
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "5173"))

    async with websockets.serve(handler, host, port):
        print(f"Running on ws://{host}:{port}")
        await asyncio.Future()

asyncio.run(main())