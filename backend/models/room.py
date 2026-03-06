import asyncio
import json
from backend.models.player import Player
from backend.models.game import Game

class Room:
    def __init__(self, id):
        self.id = id
        self.players = [] 
        self.game = None

    def add_player(self, player_id, websocket):
        player = Player(player_id, websocket)
        self.players.append(player)

    def create_game(self):
        self.game = Game(self.players, self)
        return self.game

    def get_players_ids(self):
        return [player.id for player in self.players]
    
    def game_started(self):
        return self.game is not None
    
    def get_game(self):
        return self.game

    async def broadcast(self, message):
        await asyncio.gather(*[
            player.websocket.send(json.dumps(message))
            for player in self.players
        ])