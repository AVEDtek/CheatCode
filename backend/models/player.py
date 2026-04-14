from enum import Enum

class Role(str, Enum):        
    CREWMATE = "crewmate"
    IMPOSTER = "imposter"
    
class Player:
    def __init__(self, id, websocket):
        self.id = id
        self.role = Role.CREWMATE
        self.ready = False
        self.votes = 0
        self.websocket = websocket

    def set_imposter(self):
        self.role = Role.IMPOSTER

    def set_ready(self):
        self.ready = True

    def add_vote(self):
        self.votes += 1

    def is_imposter(self):
        return self.role == Role.IMPOSTER