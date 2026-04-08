import asyncio
import json
from backend.models.player import Player
from backend.models.game import Game

class Room:
    def __init__(self, id, difficulty, capacity, coding_time, voting_time):
        self.id = id
        self.players = [] 
        self.difficulty = difficulty
        self.capacity = capacity
        self.coding_time = coding_time
        self.voting_time = voting_time
        self.game = None

    def add_player(self, player_id, websocket):
        player = Player(player_id, websocket)
        self.players.append(player)

    def remove_player(self, player_id):
        self.players[:] = [player for player in self.players if player.id != player_id]

    def create_game(self):
        self.game = Game(self, self.players, self.difficulty, self.coding_time, self.voting_time)
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