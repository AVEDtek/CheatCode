import random
import json
import time
import asyncio
import os

from enum import Enum
from typing import TypedDict
from better_profanity import profanity

from backend.managers.timeManager import TimeManager
from backend.managers.testRunner import TestRunner

def _get_min_players_to_continue():
    raw = os.getenv("MIN_PLAYERS_TO_CONTINUE", "3")
    try:
        value = int(raw)
    except ValueError:
        value = 3
    return max(1, value)

MIN_PLAYERS_TO_CONTINUE = _get_min_players_to_continue()

class GameState(str, Enum):  
    BRIEFING = "briefing"      
    CODING = "coding"            
    VOTING = "voting"            
    RESULTS = "results"

class Message(TypedDict):
    sender: str
    message: str
    timestamp: float

class Problem(TypedDict):
    id: int
    title: str
    difficulty: str
    description: str
    examples: list
    constraints: list
    topics: list
    code: str

class Commit(TypedDict):
    player_id: str
    code: str

class Game:
    def __init__(self, room, players, difficulty, coding_time, voting_time):
        self.room = room

        self.state = GameState.BRIEFING

        self.time_manager = TimeManager(self, room, coding_time, voting_time)
        self.start_timer()

        self.players = players
        self.init_players()
        self.current_player_idx = 0

        self.chat = []
        self.init_chat()
        self.commits = []

        self.problem, self.tests = self.init_random_problem_and_tests(difficulty)
        self.test_runner = TestRunner(self.tests)

    def start_timer(self):
        self.time_manager.briefing_timer_task = asyncio.create_task(self.time_manager.start_briefing_timer())
    
    def init_players(self):
        random.shuffle(self.players)
        imposter = random.choice(self.players)
        imposter.set_imposter()

    def init_chat(self):
        msg: Message = {
            "sender": "System",
            "message": "Chatroom is open. Keep your clues subtle.",
            "timestamp": time.time()
        }
        self.chat.append(msg)
    
    def init_random_problem_and_tests(self, difficulty):
        file_path = 'backend/data/problems.json'

        with open(file_path) as f:
            data = json.load(f)

        problem_pool = [
            problem for problem in data["problems"]
            if problem["difficulty"] == difficulty
        ]
        problem = random.choice(problem_pool)

        problem_obj: Problem = {
            "id": problem["id"],
            "title": problem["title"], 
            "difficulty": problem["difficulty"],
            "description": problem["description"],
            "examples": problem["examples"],
            "constraints": problem["constraints"],
            "topics": problem["topics"],
            "code": problem["code"]
        }
        tests_obj = problem["tests"]
        self.add_commit("System", problem["code"])
        return problem_obj, tests_obj

    def add_commit(self, player_id, code):
        commit: Commit = {
            "player_id": player_id,
            "code": code
        }
        self.commits.append(commit)

    async def add_message(self, sender, message, timestamp):
        message = profanity.censor(message, "*")

        msg: Message = {
            "sender": sender,
            "message": message,
            "timestamp": timestamp
        }
        self.chat.append(msg)

        response = {
            "type": "chat-update",
            "chat": self.get_chat()
        }
        await self.room.broadcast(response)

    def run_tests(self, code):
        return self.test_runner.run_tests(code)

    def parse_results(self, result):
        try:
            outputs = [r.get("output") for r in result.tests.get('results')]
            passed = [r.get("passed") for r in result.tests.get('results')]
            all_passed = all(passed)
            return outputs, passed, all_passed
        except json.JSONDecodeError:
            return [None] * len(self.tests), [False] * len(self.tests), False

    async def cast_vote(self, voter_id, voted_id):
        await self.add_message("System", f"{voter_id} has cast their vote.", time.time())
        for player in self.players:
            if player.id == voted_id:
                player.add_vote()
                break

    def set_ready(self, player_id):
        for player in self.players:
            if player.id == player_id:
                player.set_ready()
                break

    async def set_coding(self):
        await self.time_manager.stop_briefing_timer()
        self.state = GameState.CODING
        self.time_manager.coding_timer_task = asyncio.create_task(self.time_manager.start_coding_timer())

    async def turn_over(self):
        current_player = self.players[self.current_player_idx]
        websocket = current_player.websocket
        await websocket.send(json.dumps({
            "type": "turn-over"
        }))

    async def set_next_turn(self, player_id, code):
        self.add_commit(player_id, code)
        if self.time_manager.num_rounds <= 0:
            response = {
                "type": "coding-over",
                "commits": self.get_commits(),
                "votes": self.get_votes()
            }

            await self.room.broadcast(response)

            await self.set_voting()
        else:
            self.current_player_idx = (self.current_player_idx + 1) % len(self.players)
            await self.add_message("System", f"{self.players[self.current_player_idx].id}'s turn to code.", time.time())

    async def set_voting(self):
        await self.time_manager.stop_coding_timer()
        self.state = GameState.VOTING
        await self.add_message("System", "Voting has begun. Vote for the imposter!", time.time())
        self.time_manager.voting_timer_task = asyncio.create_task(self.time_manager.start_voting_timer())

    async def set_results(self):
        await self.time_manager.stop_voting_timer()
        self.state = GameState.RESULTS
    
    def get_voted(self):
        if len(self.players) == 0:
            return []
        max_votes = max(player.votes for player in self.players)
        if max_votes == 0:
            return []
        candidates = [player for player in self.players if player.votes == max_votes]
        return [candidate.id for candidate in candidates]

    def get_player_ids(self):
        return [player.id for player in self.players]

    def get_imposter_id(self):
        for player in self.players:
            if player.role == "imposter":
                return player.id
        return None

    def get_number_of_ready(self):
        return sum(1 for player in self.players if player.ready)

    def get_chat(self):
        return self.chat
    
    def get_problem(self):
        return self.problem

    def get_tests(self):
        return self.tests

    def get_commits(self):
        return self.commits
    
    def get_votes(self):
        return {player.id: player.votes for player in self.players}

    def get_number_of_votes(self):
        return sum(player.votes for player in self.players)

    def get_time_manager(self):
        return self.time_manager

    async def handle_player_disconnect(self, player_id):
        disconnected_index = next((i for i, player in enumerate(self.players) if player.id == player_id), -1)
        if disconnected_index == -1:
            return
        if self.state == GameState.RESULTS:
            self.players.pop(disconnected_index)
            return
        
        was_imposter = self.players[disconnected_index].is_imposter()
        was_current_player = disconnected_index == self.current_player_idx

        self.players.pop(disconnected_index)

        if was_imposter:
            await self.room.broadcast({
                "type": "imposter-disconnected"
            })
            await self.time_manager.stop_all_timers()
            return

        if len(self.players) < MIN_PLAYERS_TO_CONTINUE:
            await self.room.broadcast({
                "type": "not-enough-players"
            })
            await self.time_manager.stop_all_timers()
            return

        await self.add_message("System", f"{player_id} disconnected.", time.time())

        if disconnected_index < self.current_player_idx:
            self.current_player_idx -= 1

        if was_current_player:
            self.current_player_idx = self.current_player_idx % len(self.players)

        if self.state == GameState.BRIEFING and self.get_number_of_ready() >= len(self.players) // 3:
            await self.room.broadcast({
                "type": "briefing-over"
            })
            await self.set_coding()

        if self.state == GameState.CODING and was_current_player:
            await self.add_message("System", f"{self.players[self.current_player_idx].id}'s turn to code.", time.time())

        if self.state == GameState.VOTING and self.get_number_of_votes() >= len(self.players):
            response = {
                "type": "voting-over",
                "voted": self.get_voted(),
                "votedCorrectly": self.get_imposter_id() in self.get_voted()
            }
            await self.room.broadcast(response)

            await self.set_results()