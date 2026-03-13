import random
import json
import time
import asyncio
from enum import Enum
from typing import TypedDict

from backend.managers.testRunner import TestRunner

class GameState(str, Enum):        
    CODING = "coding"            
    VOTING = "voting"            
    RESULTS = "results"

class Problem(TypedDict):
    id: int
    title: str
    difficulty: str
    description: str
    examples: list
    constraints: list
    topics: list
    code: str

class Message(TypedDict):
    sender: str
    message: str
    timestamp: float

class TestCycle(TypedDict):
    input: dict
    expected: any

class Commit(TypedDict):
    player_id: str
    code: str

class Game:
    def __init__(self, players, room):
        self.room = room

        self.state = GameState.CODING
        self.time_left = 0
        self.timer_task = None

        self.players = players
        random.shuffle(self.players)
        self.assign_imposter()
        self.current_player_idx = 0

        self.chat = []
        self.load_chat()
        self.commits = []

        self.problem, self.test_cycle = self.load_random_problem_and_test_cycle()
        self.test_runner = TestRunner(self.test_cycle)
    
    def assign_imposter(self):
        imposter = random.choice(self.players)
        imposter.set_imposter()

    def load_chat(self):
        self.addMessage("System", "Chatroom is open. Keep your clues subtle.", time.time())
    
    def load_random_problem_and_test_cycle(self):
        file_path = 'backend/data/problems.json'

        with open(file_path) as f:
            data = json.load(f)
        
        problems = {
            p["id"]: {
                "title": p["title"],
                "difficulty": p["difficulty"],
                "description": p["description"],
                "examples": p["examples"],
                "constraints": p["constraints"],
                "topics": p["topics"],
                "code": p["code"], 
                "testCycle": p["testCycle"]
            } 
            for p in data["problems"]
        }
        problem_id = random.randrange(1, len(problems)+1)
        problem = problems.get(problem_id)
        problem_obj: Problem = {
            "id": problem_id,
            "title": problem["title"], 
            "difficulty": problem["difficulty"],
            "description": problem["description"],
            "examples": problem["examples"],
            "constraints": problem["constraints"],
            "topics": problem["topics"],
            "code": problem["code"]
        }
        test_cycle_obj: TestCycle = problem["testCycle"]
        self.add_commit("System", problem["code"])
        return problem_obj, test_cycle_obj

    def add_commit(self, player_id, code):
        commit: Commit = {
            "player_id": player_id,
            "code": code
        }
        self.commits.append(commit)

    def addMessage(self, sender, message, timestamp):
        msg: Message = {
            "sender": sender,
            "message": message,
            "timestamp": timestamp
        }
        self.chat.append(msg)

    def run_tests(self, code):
        return self.test_runner.run_tests(code)

    def parse_results(self, result):
        try:
            results = json.loads(result.stdout)
            outputs = [r.get("output") for r in results]
            passed = [r.get("passed") for r in results]
            all_passed = all(passed)
            return outputs, passed, all_passed
        except json.JSONDecodeError:
            return [None] * len(self.test_cycle), [False] * len(self.test_cycle), False

    def cast_vote(self, player_id):
        self.addMessage("System", f"{self.players[self.current_player_idx].id} has cast their vote.", time.time())
        for player in self.players:
            if player.id == player_id:
                player.add_vote()
                break

    async def stop_timer(self):
        if self.timer_task and not self.timer_task.done():
            self.timer_task.cancel()
            try:
                await self.timer_task
            except asyncio.CancelledError:
                pass
        self.timer_task = None
        self.time_left = 0

    async def start_timer(self, seconds):
        self.time_left = seconds
        try:
            while self.time_left > 0:
                await self.room.broadcast({
                    "type": "time-left",
                    "timeLeft": self.time_left
                })
                await asyncio.sleep(1)
                self.time_left -= 1
            
            if self.state == GameState.CODING:
                current_player = self.players[self.current_player_idx]
                websocket = current_player.websocket
                await websocket.send(json.dumps({
                    "type": "turn-over"
                }))
            elif self.state == GameState.VOTING:
                await self.set_results()
        except asyncio.CancelledError:
            pass

    async def next_turn(self, player_id, code):
        if len(self.players) == 0:
            return
        self.add_commit(player_id, code)
        self.current_player_idx = (self.current_player_idx + 1) % len(self.players)
        self.addMessage("System", f"{self.players[self.current_player_idx].id}'s turn to code.", time.time())
        await asyncio.create_task(self.stop_timer())
        self.timer_task = asyncio.create_task(self.start_timer(30))
        
    
    def get_voted(self):
        if len(self.players) == 0:
            return []
        max_votes = max(player.votes for player in self.players)
        if max_votes == 0:
            return []
        candidates = [player for player in self.players if player.votes == max_votes]
        return [candidate.id for candidate in candidates]

    async def handle_player_disconnect(self, player_id):
        disconnected_index = next((i for i, player in enumerate(self.players) if player.id == player_id), -1)
        if disconnected_index == -1:
            return

        was_current_player = disconnected_index == self.current_player_idx

        self.players.pop(disconnected_index)
        self.addMessage("System", f"{player_id} disconnected.", time.time())

        if len(self.players) == 0:
            await self.stop_timer()
            return

        if disconnected_index < self.current_player_idx:
            self.current_player_idx -= 1

        if was_current_player:
            self.current_player_idx = self.current_player_idx % len(self.players)

        if self.state == GameState.CODING and was_current_player:
            self.addMessage("System", f"{self.players[self.current_player_idx].id}'s turn to code.", time.time())
            await self.stop_timer()
            self.timer_task = asyncio.create_task(self.start_timer(30))

        if self.state == GameState.VOTING and self.get_number_of_votes() >= len(self.players):
            await self.set_results()

    async def set_voting(self, player_id, code):
        self.state = GameState.VOTING
        self.add_commit(player_id, code)
        self.addMessage("System", "Voting has begun. Vote for the imposter!", time.time())
        await asyncio.create_task(self.stop_timer())
        self.timer_task = asyncio.create_task(self.start_timer(120))

    async def set_results(self):
        self.state = GameState.RESULTS
        await self.stop_timer()
        response = {
            "type": "vote-over",
            "voted": self.get_voted(),
            "votedCorrectly": self.get_imposter_id() in self.get_voted(),
        }
        await self.room.broadcast(response)

    def get_player_ids(self):
        return [player.id for player in self.players]

    def get_imposter_id(self):
        for player in self.players:
            if player.role == "imposter":
                return player.id
        return None

    def get_chat(self):
        return self.chat
    
    def get_problem(self):
        return self.problem

    def get_test_cycle(self):
        return self.test_cycle

    def get_commits(self):
        return self.commits
    
    def get_votes(self):
        return {player.id: player.votes for player in self.players}

    def get_number_of_votes(self):
        return sum(player.votes for player in self.players)