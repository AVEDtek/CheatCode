import asyncio
import json
import time
import random
from backend.models.player import Player
from backend.models.game import Game

class Room:
    def __init__(self, id):
        self.id = id
        self.players = [] 
        self.game = None

        # Lobby mini-game state:
        # key: playerId
        # value: dict with position/motion/render metadata
        self.lobby_players = {}

    def add_player(self, player_id, websocket):
        player = Player(player_id, websocket)
        self.players.append(player)

        # create initial mini-game state as soon as a player joins
        self.init_lobby_player(player_id) 

    def remove_player(self, player_id):
        self.players[:] = [player for player in self.players if player.id != player_id]

        # remove mini-game state when player leaves/disconnects
        self.remove_lobby_player(player_id) 

    def create_game(self):
        self.game = Game(self.players, self)
        return self.game

    def get_players_ids(self):
        return [player.id for player in self.players]

    def player_exists(self, player_id):
        return any(player.id == player_id for player in self.players)

    def get_number_of_players(self):
        return len(self.players)
    
    def game_started(self):
        return self.game is not None
    
    def get_game(self):
        return self.game

    async def broadcast(self, message):
        await asyncio.gather(*[
            player.websocket.send(json.dumps(message))
            for player in self.players
        ], return_exceptions=True)

    def spawn_position(self):
        # spawn inside a safe region away from borders
        return random.randint(40, 760), random.randint(40,460)

    def stable_color(self, player_id):
        # deterministic color for each palyer so they remain visually consistent
        colors = ["#22c55e", "#06b6d4", "#f59e0b", "#ef4444", "#eab308"]
        idx = sum(ord(ch) for ch in player_id) % len(colors)
        return colors[idx]

    def init_lobby_player(self, player_id):
        # initialize player state in lobby mini-game
        x, y = self.spawn_position()
        self.lobby_players[player_id] = {
            "playerId": player_id,
            "x": x,
            "y": y,
            "vx": 0,
            "vy": 0,
            "color": self.stable_color(player_id),
            "updatedAt": int(time.time() * 1000)
        }
    
    def remove_lobby_player(self, player_id):
        if player_id in self.lobby_players:
            del self.lobby_players[player_id]

    def update_lobby_player(self, player_id, x, y, vx, vy):
        # defensive creation if state ever desyncs
        if player_id  not in self.lobby_players:
            self.init_lobby_player(player_id)
        self.lobby_players[player_id]["x"] = x
        self.lobby_players[player_id]["y"] = y
        self.lobby_players[player_id]["vx"] = vx
        self.lobby_players[player_id]["vy"] = vy
        self.lobby_players[player_id]["updatedAt"] = int(time.time() * 1000)

    def get_lobby_state(self):
        # return list payload suitable for websocket broadcast
        return list(self.lobby_players.values())