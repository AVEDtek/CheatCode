import asyncio
import websockets
import json
import os
from backend.managers.roomManager import RoomManager

room_manager = RoomManager()

lobby_width = 800
lobby_height = 500
player_radius = 16

def clamp_position(x,y):
    cx = max(player_radius, min(lobby_width - player_radius, int(x)))
    cy = max(player_radius, min(lobby_height - player_radius, int(y)))
    return cx, cy


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

                await room.broadcast({
                    "type": "lobby-state",
                    "players": room.get_lobby_state()
                })

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

                room.remove_player(player_id)

                await room.broadcast({
                    "type": "lobby-player-left",
                    "playerId": player_id
                })
                await room.broadcast({
                    "type": "lobby-state",
                    "players": room.get_lobby_state()
                })

                if room.get_number_of_players() == 0:
                    room_manager.remove_room(room_id)
                    print("Deleted empty room: " + room_id)
                else:
                    response = {
                        "type": "room-players-update",
                        "playerList": room.get_players_ids()
                    }
                    await room.broadcast(response)

                connected_room_id = None
                connected_player_id = None

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


                # create the game but enter the "briefing" stage first
                game = room.create_game()
                problem = game.get_problem()
                test_cycle = game.get_test_cycle()
            
                print("Game in room " + room_id + " started (briefing)")

                # initialize briefing state on game
                game.state = "briefing"
                # correct attribute name and ensure it's a set
                game.ready_players = set()
                game.briefing_task = None

                response = {
                    "type": "game-started",
                    "playerList": game.get_player_ids(),
                    "imposterId": game.get_imposter_id(),
                    "chat": game.get_chat(),
                    "problem": problem,
                    "testCycle": test_cycle
                }

                # broadcast briefing start (clients show modal)
                await room.broadcast(response)

                # briefing watchdog that will auto-end briefing after timeout
                async def briefing_watchdog(room, game, timeout = 15):
                    await asyncio.sleep(timeout)
                    # only transition if still in briefing
                    if getattr(game, "state", None) == "briefing":
                        # transition to coding (assignment, not subtraction)
                        game.state = "coding"
                        # broadcast briefing ended -> official start
                        await room.broadcast({"type": "briefing-ended", "message": "Briefing time over. Game starting."})
                        # start timer
                        game.timer_task = asyncio.create_task(game.start_timer(30))
                        print(f"Briefing timeout reached in room {room_id}, game started")
                
                # store the briefing watchdog task (timeout can be tuned)
                game.briefing_task = asyncio.create_task(briefing_watchdog(room, game, 20))
        
            # new handler to handle player signalling that they closed briefing
            elif msg_type == "player-ready":
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
                # if no game or not in briefing, ignore or notify
                if not room.game_started():
                    await websocket.send("No game running in room")
                    continue
                game = room.get_game()
                if getattr(game, "state", None) != "briefing":
                    await websocket.send("Not in briefing phase")
                    continue
                
                # mark player ready
                # defensive: ensure ready_players exists
                if not hasattr(game, "ready_players") or game.ready_players is None:
                    game.ready_players = set()
                game.ready_players.add(player_id)

                # broadcast ready count so clients can update UI
                await room.broadcast({"type": "player-ready-update", "readyList": list(game.ready_players)})

                # if everyone is ready, cancel briefing watchdog and start game immediately
                if len(game.ready_players) >= room.get_number_of_players():
                    # cancel the briefing task if it's pending
                    bt = getattr(game, "briefing_task", None)
                    if bt is not None and not bt.done():
                        bt.cancel()
                        try:
                            await bt
                        except asyncio.CancelledError:
                            pass
                        
                    # transition to coding and start timers
                    game.state = "coding"
                    await room.broadcast({"type": "briefing-ended", "message": "All players ready. Game starting."})
                    game.timer_task = asyncio.create_task(game.start_timer(30))
                    print(f"All players ready in room {room_id}, game started")

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

                if game.state != "coding":
                    await websocket.send("Coding not in progress")
                    continue

                await game.next_turn(player_id, code)

                response = {
                    "type": "next-turn",
                    "currentPlayer": game.players[game.current_player_idx].id,
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
                    player_id = data["playerId"]
                except KeyError:
                    await websocket.send("Missing player ID")
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

                game.cast_vote(player_id)

                response = {
                    "type": "vote-casted",
                    "voteList": game.get_votes(),
                    "chat": game.get_chat()
                }
                await room.broadcast(response)

                if game.get_number_of_votes() == room.get_number_of_players():
                    await game.set_results()

            elif msg_type == "lobby-init":
                try:
                    room_id = data["roomId"]
                    player_id = data["playerId"]
                except KeyError:
                    await websocket.send("Missing roomId or playerId")
                    continue

                if not room_manager.room_exists(room_id):
                    await websocket.send("No room found: " + room_id)
                    continue

                room = room_manager.get_room(room_id)
                if not room.player_exists(player_id):
                    await websocket.send("Player not found in room: "+ player_id)
                    continue

                # ensure sender exists in lobby state
                room.init_lobby_player(player_id)
                await websocket.send(json.dumps({
                    "type": "lobby-state",
                    "players": room.get_lobby_state()
                }))

            elif msg_type == "lobby-move":
                try:
                    room_id = data["roomId"]
                    player_id = data["playerId"]
                    x = data["x"]
                    y = data["y"]
                    vx = data.get("vx", 0)
                    vy = data.get("vy", 0)
                except KeyError:
                    await websocket.send("Missing lobby-move fields")
                    continue
                
                if not room_manager.room_exists(room_id):
                    await websocket.send("No room found: " + room_id)
                    continue

                room = room_manager.get_room(room_id)
                if not room.player_exists(player_id):
                    await websocket.send("Player not found in room: " + player_id)
                    continue
                
                cx, cy = clamp_position(x, y)
                room.update_lobby_player(player_id, cx, cy, vx, vy)

                await room.broadcast({
                    "type": "lobby-state",
                    "players": room.get_lobby_state()
                })

            else:
                await websocket.send(f"Unknown message type: {msg_type}")

    except websockets.exceptions.ConnectionClosed:
        print("Client disconnected")
    finally:
        # Connection may close before this socket ever joins a room.
        if connected_room_id is None or connected_player_id is None:
            return

        if not room_manager.room_exists(connected_room_id):
            return

        room = room_manager.get_room(connected_room_id)
        if not room.player_exists(connected_player_id):
            return

        if room.game_started():
            game = room.get_game()
            await game.handle_player_disconnect(connected_player_id)
        else:
            room.remove_player(connected_player_id)
            await room.broadcast({
                "type": "lobby-player-left",
                "playerId": connected_player_id
            })
            await room.broadcast({
                "type": "lobby-state",
                "players": room.get_lobby_state()
})

        if room.get_number_of_players() == 0:
            room_manager.remove_room(connected_room_id)
            print("Deleted empty room: " + connected_room_id)
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
                    "currentPlayer": game.players[game.current_player_idx].id,
                    "chat": game.get_chat()
                }
                await room.broadcast(response)

async def main():
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "5173"))

    async with websockets.serve(handler, host, port):
        print(f"Running on ws://{host}:{port}")
        await asyncio.Future()

asyncio.run(main())