import asyncio
import websockets
import json
import os
import re
import random

from dotenv import load_dotenv
from pathlib import Path

load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")

from backend.managers.roomManager import RoomManager
from backend.models.game import GameState


def _get_int_env(name: str, default: int, minimum: int) -> int:
    raw = os.getenv(name, str(default))
    try:
        value = int(raw)
    except ValueError:
        value = default
    return max(minimum, value)


def _get_bool_env(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}

def _get_min_players_to_start() -> int:
    return _get_int_env("MIN_PLAYERS_TO_START", default=3, minimum=1)

MIN_PLAYERS_TO_START = _get_min_players_to_start()
MAX_WS_MESSAGE_BYTES = _get_int_env("MAX_WS_MESSAGE_BYTES", default=65536, minimum=1024)
MAX_PLAYER_ID_LENGTH = _get_int_env("MAX_PLAYER_ID_LENGTH", default=24, minimum=3)
MAX_CHAT_MESSAGE_LENGTH = _get_int_env("MAX_CHAT_MESSAGE_LENGTH", default=600, minimum=20)
MAX_CODE_LENGTH = _get_int_env("MAX_CODE_LENGTH", default=30000, minimum=100)
HEALTH_ENDPOINT_ENABLED = _get_bool_env("HEALTH_ENDPOINT_ENABLED", default=False)
ROOM_ID_PATTERN = re.compile(r"^[A-Z0-9]{6}$")

# Lobby platformer geometry — must stay in sync with PLATFORMS/GOAL_SIZE in LobbyPlatformer.tsx
_LOBBY_GOAL_SIZE = 10
_LOBBY_PLATFORMS = [
    (0, 164, 320, 16),
    (36, 136, 74, 10),
    (132, 108, 66, 10),
    (218, 82, 74, 10),
]

def _lobby_random_goal() -> tuple[int, int]:
    surfaces = [(p[0], p[1] - _LOBBY_GOAL_SIZE, p[2] - _LOBBY_GOAL_SIZE) for p in _LOBBY_PLATFORMS]
    total_span = sum(s[2] for s in surfaces)
    pick = random.random() * total_span
    for x, y, span in surfaces:
        if pick < span:
            return int(x + pick), y
        pick -= span
    x, y, span = surfaces[-1]
    return int(x + random.random() * span), y


room_manager = RoomManager()




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
                    "playerList": room.get_players_ids(),
                    "hostId": room.host_id
                }
                await room.broadcast(response)
                if room.game_started():
                    game = room.get_game()
                    response = {
                        "type": "game-players-update",
                        "playerList": game.get_player_ids(),
                        "playerId": game.players[game.current_player_idx].id
                    }
                    await room.broadcast(response)

handlers = {}

def handler(event_type):
    def decorator(func):
        handlers[event_type] = func
        return func
    return decorator

@handler("create-room")
async def handle_create_room(websocket, data):
    try:
        player_id = data["playerId"]
        difficulty = data["difficulty"]
        capacity = data["capacity"]
        coding_time = data["codingTime"]
        voting_time = data["votingTime"]
        turn_duration = data["turnDuration"]
    except KeyError as e:
        await websocket.send(f"Missing field: {str(e)}")
        return

    if turn_duration not in (30, 60):
        await websocket.send(json.dumps({"type": "error", "message": "turnDuration must be 30 or 60"}))
        return

    room_id = room_manager.create_room(difficulty, capacity, coding_time, voting_time, turn_duration)
    room = room_manager.get_room(room_id)
    room.add_player(player_id, websocket)
    room.host_id = player_id

    response = {
        "type": "room-created",
        "roomId": room_id,
        "playerId": player_id,
        "difficulty": difficulty,
        "capacity": capacity,
        "codingTime": coding_time,
        "votingTime": voting_time,
        "turnDuration": turn_duration,
        "hostId": room.host_id
    }
    await websocket.send(json.dumps(response))
    return {
        "roomId": room_id,
        "playerId": player_id
    }
    
@handler("join-room")
async def handle_join_room(websocket, data):
    try:
        room_id = data["roomId"]
        player_id = data["playerId"]
    except KeyError as e:
        await websocket.send(f"Missing field: {str(e)}")
        return
    
    if not room_manager.room_exists(room_id):
        response = {
            "type": "unable-to-join",
            "errorMessage": "Room does not exist"
        }
        await websocket.send(json.dumps(response))
        return
    room = room_manager.get_room(room_id)
    if room.game_started():
        response = {
            "type": "unable-to-join",
            "errorMessage": "Game in progress"
        }
        await websocket.send(json.dumps(response))
        return
    if room.player_exists(player_id):
        response = {
            "type": "unable-to-join",
            "errorMessage": "Username already taken in room"
        }
        await websocket.send(json.dumps(response))
        return
    if room.get_number_of_players() >= room.capacity:
        response = {
            "type": "unable-to-join",
            "errorMessage": "Room is full"
        }
        await websocket.send(json.dumps(response))
        return
    
    room.add_player(player_id, websocket)

    response = {
        "type": "room-joined",
        "roomId": room_id,
        "playerId": player_id,
        "difficulty": room.difficulty,
        "capacity": room.capacity,
        "codingTime": room.coding_time,
        "votingTime": room.voting_time,
        "turnDuration": room.turn_duration,
        "playerList": room.get_players_ids(),
        "hostId": room.host_id
    }
    await websocket.send(json.dumps(response))
    await websocket.send(json.dumps({
        "type": "lobby-goal-update",
        "x": room.lobby_goal_x,
        "y": room.lobby_goal_y,
        "goalVersion": room.lobby_goal_version,
    }))
    response = {
        "type": "room-players-update",
        "playerList": room.get_players_ids(),
        "hostId": room.host_id
    }
    await room.broadcast(response)
    return {
        "roomId": room_id,
        "playerId": player_id
    }

@handler("leave")
async def handle_leave(websocket, data):
    try:
        room_id = data["roomId"]
        player_id = data["playerId"]
    except KeyError as e:
        await websocket.send(f"Missing field: {str(e)}")
        return
    
    await handle_disconnect(room_id, player_id)

    return {
        "roomId" : None, 
        "playerId": None
    }

@handler("start-game")
async def handle_start_game(websocket, data):
    try:
        room_id = data["roomId"]
    except KeyError as e:
        await websocket.send(f"Missing field: {str(e)}")
        return
    if not room_manager.room_exists(room_id):
        await websocket.send("No room found: " + room_id)
        return
    
    room = room_manager.get_room(room_id)

    async with room.game_start_lock:
        if room.game_started():
            await websocket.send("Game already started in room: " + room_id)
            return

        game = room.create_game()

    problem = game.get_problem()
    test_cases = game.get_tests()

    response = {
        "type": "game-started",
        "playerList": game.get_player_ids(),
        "imposterId": game.get_imposter_id(),
        "chat": game.get_chat(),
        "problem": problem,
        "tests": test_cases
    }
    await room.broadcast(response)

@handler("set-ready")
async def handle_set_ready(websocket, data):
    try:
        room_id = data["roomId"]
        player_id = data["playerId"]
    except KeyError as e:
        await websocket.send(f"Missing field: {str(e)}")
        return
    
    if not room_manager.room_exists(room_id):
        await websocket.send("No room found: " + room_id)
        return

    room = room_manager.get_room(room_id)

    if not room.game_started():
        await websocket.send("No game running in room")
        return

    game = room.get_game()

    if game.state != GameState.BRIEFING:
        await websocket.send("Not in briefing phase")
        return
    
    if not room.player_exists(player_id):
        await websocket.send("Player not found in room: " + player_id)
        return

    game.set_ready(player_id)

    response = {
        "type": "player-ready",
        "readyCount": game.get_number_of_ready()
    }
    await room.broadcast(response)

    if game.get_number_of_ready() == room.get_number_of_players():
        await room.broadcast({
            "type": "briefing-over"
        })
        await game.set_coding()

@handler("next-turn")
async def handle_next_turn(websocket, data):
    try:
        room_id = data["roomId"]
        player_id = data["playerId"]
        code = data["code"]
    except KeyError as e:
        await websocket.send(f"Missing field: {str(e)}")
        return
    
    if not room_manager.room_exists(room_id):
        await websocket.send("No room found: " + room_id)
        return

    room = room_manager.get_room(room_id)
    if not room.game_started():
        await websocket.send("Game not in progress")
        return

    game = room.get_game()

    if game.state != GameState.CODING:
        await websocket.send("Coding not in progress")
        return

    if game.players[game.current_player_idx].id != player_id:
        await websocket.send("Not your turn")
        return

    await game.set_next_turn(player_id, code)
    time_manager = game.get_time_manager()

    if time_manager.num_rounds > 0:
        response = {
            "type": "next-turn",
            "playerId": game.players[game.current_player_idx].id,
            "code": code
        }
        await room.broadcast(response)

@handler("send-message")
async def handle_send_message(websocket, data):
    try:
        room_id = data["roomId"]
        player_id = data["playerId"]
        message = data["message"]
        timestamp = data["timestamp"]
    except KeyError as e:
        await websocket.send(f"Missing field: {str(e)}")
        return
    if not room_manager.room_exists(room_id):
        await websocket.send("No room found: " + room_id)
        return
    room = room_manager.get_room(room_id)
    if not room.game_started():
        await websocket.send("Game not in progress")
        return
    game = room.get_game()
    await game.add_message(player_id, message, timestamp)

@handler("new-code")
async def handle_new_code(websocket, data):
    try:
        room_id = data["roomId"]
        code = data["code"]
    except KeyError as e:
        await websocket.send(f"Missing field: {str(e)}")
        return
    if not room_manager.room_exists(room_id):
        await websocket.send("No room found: " + room_id)
        return
    room = room_manager.get_room(room_id)
    if not room.game_started():
        await websocket.send("Game not in progress")
        return
    response = {
        "type": "new-code",
        "code": code
    }
    await room.broadcast(response)


@handler("cursor-update")
async def handle_cursor_update(websocket, data):
    try:
        room_id = data["roomId"]
        player_id = data["playerId"]
        line = int(data["line"])
        column = int(data["column"])
    except (KeyError, ValueError, TypeError) as e:
        await websocket.send(f"Missing or invalid field: {str(e)}")
        return

    if line < 1 or column < 1:
        await websocket.send("Invalid cursor position")
        return

    if not room_manager.room_exists(room_id):
        await websocket.send("No room found: " + room_id)
        return

    room = room_manager.get_room(room_id)
    if not room.game_started():
        await websocket.send("Game not in progress")
        return

    game = room.get_game()
    if game.state != GameState.CODING:
        return

    if game.players[game.current_player_idx].id != player_id:
        return

    game.set_cursor_position(player_id, line, column)

    await room.broadcast({
        "type": "cursor-update",
        "playerId": player_id,
        "line": line,
        "column": column,
    })

@handler("run-tests")
async def handle_run_tests(websocket, data):
    try:
        room_id = data["roomId"]
        player_id = data["playerId"]
        code = data["code"]
    except KeyError as e:
        await websocket.send(f"Missing field: {str(e)}")
        return
    if not room_manager.room_exists(room_id):
        await websocket.send("No room found: " + room_id)
        return
    room = room_manager.get_room(room_id)
    if not room.game_started():
        await websocket.send("Game not in progress")
        return
    game = room.get_game()

    if game.state != GameState.CODING:
        await websocket.send("Coding not in progress")
        return

    if game.tests_running:
        await websocket.send(json.dumps({"type": "tests-running"}))
        return

    game.tests_running = True
    loop = asyncio.get_event_loop()
    try:
        results = await loop.run_in_executor(None, game.run_tests, code)
    finally:
        game.tests_running = False
    if results["returncode"] != 0:
        outputs, passed = [results["stderr"]] * len(game.get_tests()), [False] * len(game.get_tests())
        response = {
            "type": "test-results",
            "error": True,
            "outputList": outputs,
            "passedList": passed
        }
        await websocket.send(json.dumps(response))
        return

    outputs, passed, duration, all_passed = game.parse_results(results)

    response = {
        "type": "test-results",
        "error": False,
        "outputList": outputs,
        "passedList": passed,
        "durationList": duration
    }
    await websocket.send(json.dumps(response))

    if all_passed:
        game.add_commit(player_id, code)
        await game.set_voting()
        
        response = {
            "type": "coding-over",
            "reason": "solved",
            "commits": game.get_commits(),
            "votes": game.get_votes()
        }
        await room.broadcast(response)

@handler("cast-vote")
async def handle_cast_vote(websocket, data):
    try:
        room_id = data["roomId"]
        voter_id = data["voterId"]
        voted_id = data["votedId"]
    except KeyError as e:
        await websocket.send(f"Missing field: {str(e)}")
        return
    if not room_manager.room_exists(room_id):
        await websocket.send("No room found: " + room_id)
        return
    room = room_manager.get_room(room_id)
    if not room.game_started():
        await websocket.send("Game not in progress")
        return
    game = room.get_game()

    if game.state != GameState.VOTING:
        await websocket.send("Voting not in progress")
        return

    await game.cast_vote(voter_id, voted_id)

    response = {
        "type": "vote-casted",
        "voteList": game.get_votes()
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

@handler("play-again")
async def handle_play_again(websocket, data):
    try:
        room_id = data["roomId"]
        player_id = data["playerId"]
    except KeyError as e:
        await websocket.send(f"Missing field: {str(e)}")
        return

    if not room_manager.room_exists(room_id):
        await websocket.send("No room found: " + room_id)
        return

    room = room_manager.get_room(room_id)
    if not room.game_started():
        await websocket.send("Game not in progress")
        return

    game = room.get_game()

    if game.state != GameState.RESULTS:
        await websocket.send("Rematch not available")
        return

    if not room.player_exists(player_id):
        await websocket.send("Player not found in room: " + player_id)
        return

    game.add_rematch_ready(player_id)

    response = {
        "type": "rematch-update",
        "playerList": game.get_player_ids(),
        "readyList": game.get_rematch_ready(),
        "hostId": room.host_id
    }
    await room.broadcast(response)

@handler("lobby-player-pos")
async def handle_lobby_player_pos(websocket, data):
    try:
        room_id = data["roomId"]
        player_id = data["playerId"]
        x = float(data["x"])
        y = float(data["y"])
        score = int(data["score"])
        crouching = bool(data.get("crouching", False))
    except (KeyError, ValueError, TypeError):
        return

    if not room_manager.room_exists(room_id):
        return
    room = room_manager.get_room(room_id)
    if room.game_started():
        return

    await room.broadcast_except(websocket, {
        "type": "lobby-player-pos",
        "playerId": player_id,
        "x": x,
        "y": y,
        "score": score,
        "crouching": crouching,
    })


@handler("lobby-goal-reached")
async def handle_lobby_goal_reached(websocket, data):
    try:
        room_id = data["roomId"]
        goal_version = int(data["goalVersion"])
    except (KeyError, ValueError, TypeError):
        return

    if not room_manager.room_exists(room_id):
        return
    room = room_manager.get_room(room_id)
    if room.game_started():
        return
    if goal_version != room.lobby_goal_version:
        return

    new_x, new_y = _lobby_random_goal()
    room.lobby_goal_x = new_x
    room.lobby_goal_y = new_y
    room.lobby_goal_version += 1

    await room.broadcast({
        "type": "lobby-goal-update",
        "x": new_x,
        "y": new_y,
        "goalVersion": room.lobby_goal_version,
    })


@handler("get-health")
async def handle_get_health(websocket, data):
    response = {
        "type": "health",
        "rooms": room_manager.get_rooms()
    }
    await websocket.send(json.dumps(response))


@handler("sync-game-state")
async def handle_sync_game_state(websocket, data):
    try:
        room_id = data["roomId"]
    except KeyError as e:
        await websocket.send(f"Missing field: {str(e)}")
        return

    if not room_manager.room_exists(room_id):
        await websocket.send("No room found: " + room_id)
        return

    room = room_manager.get_room(room_id)
    if not room.game_started():
        await websocket.send("No game running in room")
        return

    game = room.get_game()
    await websocket.send(json.dumps(game.get_sync_payload()))


async def websocket_handler(websocket):
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
            
            msg_type = data.get("type")
            if not msg_type:
                await websocket.send("Missing message type")
                continue
            
            handler_func = handlers.get(msg_type)
            if not handler_func:
                await websocket.send(f"Unknown message type: {msg_type}")
                continue
                
            try:
                result = await handler_func(websocket, data)
                if result:
                    if "roomId" in result:
                        connected_room_id = result['roomId']
                    if "playerId" in result:
                        connected_player_id = result['playerId']
            except Exception as e:
                print(f"Error handling message of type {msg_type}: {str(e)}")
                await websocket.send("Internal server error")
    except websockets.exceptions.ConnectionClosed:
        print("Client disconnected")
    finally:
        await handle_disconnect(connected_room_id, connected_player_id)

async def main():
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8765"))

    async with websockets.serve(websocket_handler, host, port):
        print(f"Running on ws://{host}:{port}")
        await asyncio.Future()

asyncio.run(main())