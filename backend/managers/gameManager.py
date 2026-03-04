import random
import json
import time
import asyncio

from backend.managers.codeRunner import Engine
class Commit:
    def __init__(self, playerid, code):
        self.playerid = playerid
        self.code = code


class Game:
    def __init__(self, gameId):
        self.state = "waiting"
        self.gameId = gameId
        self.players = []

        self.turns = []

        self.timer_task = None
        self.time_left = 0

        self.questionId = None
        self.questionTitle = ""
        self.questionCategory = ""
        self.questionDifficulty = ""
        self.questionDesc = ""
        self.questionExample = ""
        self.questionStarterCode = ""
        self.questionFuncName = ""
        self.questionParameters = []
        self.sourceCode = []
        
        self.currentPlayer: Player = None

    async def stopTimer(self):
        if self.timer_task and not self.timer_task.done():
            self.timer_task.cancel()
            try:
                await self.timer_task
            except asyncio.CancelledError:
                pass
        self.timer_task = None
        self.time_left = 0

    async def startTimer(self, seconds):
        self.time_left = seconds
        try:
            while self.time_left > 0:
                await self.emit({
                    "type": "time-left",
                    "roomid": self.gameId,
                    "timeLeft": self.time_left,
                    "currentPlayer": self.currentPlayer.userName if self.currentPlayer else ""
                })
                await asyncio.sleep(1)
                self.time_left -= 1
            await self.nextTurn()
        except asyncio.CancelledError:
            pass

    def commit(self, playerid, code) -> Commit:
        commit = Commit(playerid, code)
        self.sourceCode.append([commit.playerid, commit.code])
        return self.sourceCode
    
    def getCommitLogs(self):
        commitLogs = {
            "Commits":[] #[self.sourceCode[i][0], self.sourceCode[i][1]] for i in range(len(self.sourceCode))
        }
        for i in range(len(self.sourceCode)):
            commitLogs["Commits"].append([
                self.sourceCode[i][0],
                self.sourceCode[i][1]
            ]
        )   
           
        return commitLogs

    def getSourceCode(self):
        return self.sourceCode[len(self.sourceCode)-1][1]
    
    def startGame(self):
        self.state = "initializing"
        self.assignRoles()
        self.setVotes()
        self.assignTurns()
        #self.getQuestion()
        self.selectQuestion(2)
        

    async def startRound(self):
        self.state = "in-progress"
        await self.stopTimer()
        self.timer_task = asyncio.create_task(self.startTimer(15))



    async def addPlayer(self, id, websocket):
        player = Player(
            id=id,
            websocket=websocket,
        )  
        self.players.append(player)

        await self.emit(self.getListOfPlayers())

    async def emit(self, message):
        if not self.players:
            return

        await asyncio.gather(*[
            player.websocket.send(json.dumps(message))
            for player in self.players
        ])

    def assignRoles(self):
        for player in self.players:
            player.role = "crewmate"

        temp = self.players
        if len(self.players) == 1:
                imposter = temp[0]
                imposter.role = "imposter"
                return imposter
        
        imposter = temp[random.randrange(0, len(temp))]
        imposter.role = "imposter"
        return imposter

    def getOrder(self):
        order = []
        for player in self.turns:
            order.append(player.userName)
        return order


    def assignTurns(self):
        random.shuffle(self.players)  
        root = self.players[0]
        current = root

        self.turns = [root]
        
        for i in range(1, len(self.players)):
            current.next = self.players[i]
            current = current.next
            self.turns.append(current)
        current.next = root

        self.currentPlayer = root

    async def nextTurn(self):
        await self.stopTimer()
        self.currentPlayer.active = False
        self.currentPlayer = self.currentPlayer.next
        self.currentPlayer.active = True
        await self.emit({
            "type": "next-turn",
            # was: self.currentPlayer.id
            "name": self.currentPlayer.userName
        })
        # Start timer for the new turn
        self.timer_task = asyncio.create_task(self.startTimer(15))

    
    def determineWinner(self):
        imposterWin = False
        if not self.players:
            return imposterWin

        votes = {player: player.votes for player in self.players}

        max_votes = max(votes.values())

        candidates = [player for player, v in votes.items() if v == max_votes]

        if len(candidates) > 1:
            print("Tie! The imposter wins!")
            imposterWin = True
            return imposterWin  # Imposter wins

        voted_off = candidates[0]

        if voted_off.is_imposter():
            print(f"{voted_off.userName} was the imposter! Crewmates win!")
            return imposterWin # Imposter did not win
        else:
            print(f"{voted_off.userName} was not the imposter. Imposter wins!")
            imposterWin = True
            return imposterWin  # Imposter wins


    def addVote(self, playerid):
        for player in self.players:
            if player.id == playerid:
                player.votes += 1
                break

    def setVotes(self):
        for player in self.players:
            player.votes = 0

    def getVotes(self):
        votes = {
            player.userName: player.votes for player in self.players
        }
        return votes

    def switchTurns(self):
        self.currentPlayer.active = False
        self.currentPlayer = self.currentPlayer.next
        self.currentPlayer.active = True
        return self.currentPlayer

    def nextPlayer(self):
        if self.currentPlayer:
            self.currentPlayer = self.currentPlayer.next

    def getQuestion(self):  
        filePath = 'backend/test_questions/questions.json'

        with open(filePath) as f:
            data = json.load(f)
        
        questions = {
            q["id"]: {
                "title": q["title"],
                "category": q["category"],
                "difficulty": q["difficulty"],
                "description": q["description"],
                "examples": q["examples"],
                "starter_code": q["starter_code"],
                "function_name": q["function_name"],
                "parameters": q["parameters"]
            } 
            for q in data["questions"]
        }
        self.questionId = random.randrange(1, len(questions)+1)

        question =  questions.get(self.questionId)        
        self.commit("SYSTEM", question["starter_code"])
        self.questionDifficulty = question["difficulty"]
        self.questionTitle = question["title"]
        self.questionCategory = "Test Category"
        #self.questionCategory = question["category"]
        self.questionDesc = question["description"]
        self.questionExample = question["examples"]
        self.questionStarterCode = question["starter_code"]    
        self.questionFuncName = question["function_name"]
        self.questionParameters.append(question["parameters"])
        return question

    def runCode(self, source_code):
        result = Engine(source_code, self.getTests(), self.questionFuncName).runTests()
        
        if not result.stdout:
            return {str(self.questionId): {"tests": [{"error": result.stderr, "passed": False}]}}
        
        test_results = json.loads(result.stdout)
        
        return {
            str(self.questionId): {
                "tests": [
                    {"input": t["input"], "passed": t["passed"]}
                    for t in test_results
                ]
            }
        }
    
    def getTests(self):
        filePath = 'backend/test_questions/testcases.json'

        with open(filePath) as f:
            data = json.load(f)

        tests = data.get(str(self.questionId)).get("tests")  
        return tests

    
    def selectQuestion(self,Id):
        filePath = 'backend/test_questions/questions.json'

        with open(filePath) as f:
            data = json.load(f)
        
        questions = {
            q["id"]: {
                "title": q["title"],
                "difficulty": q["difficulty"],
                "description": q["description"],
                "examples": q["examples"],
                "starter_code": q["starter_code"],
                "function_name": q["function_name"],   
                "parameters": q["parameters"],          
            } 
            for q in data["questions"]
        }
        question = questions.get(Id)
        self.commit("SYSTEM", question["starter_code"])
        self.questionId = Id
        self.questionDifficulty = question["difficulty"]
        self.questionTitle = question["title"]
        self.questionDesc = question["description"]
        self.questionExample = question["examples"]
        self.questionStarterCode = question["starter_code"]
        self.questionFuncName = question["function_name"]      
        self.questionParameters.append(question["parameters"])  
        return question

    def getListOfPlayers(self):
        return {
            "type": "player-list",
            "players": [player.userName for player in self.players]
        }
    
    def getListOfTurns(self):
        return {
            "type": "turn-list",
            "players": [player.userName for player in self.turns]
        }

class Node:
    def __init__(self):
        self.next = None
        self.back = None

class Player(Node):
    def __init__(self, id, websocket, userName):
        super().__init__()
        self.votes = 0
        self.id = id
        self.active = False
        self.websocket = websocket
        self.userName = userName
        self.role = "crewmate"

    def set_role(self, role):
        self.role = role

    def is_imposter(self):
        return self.role == "imposter"


if __name__ == "__main__":
    # --- Voting Process Tests ---
    print("\n=== Voting Process Tests ===")

    # Setup a fresh game with players
    vote_game = Game("vote_test")
    p1 = Player(id="p1", websocket=None, userName="Alice")
    p2 = Player(id="p2", websocket=None, userName="Bob")
    p3 = Player(id="p3", websocket=None, userName="Charlie")
    vote_game.players = [p1, p2, p3]

    # Manually assign one imposter for deterministic testing
    p2.role = "imposter"

    # Initialize votes
    vote_game.setVotes()
    print(f"Initial votes: {vote_game.getVotes()}")

    # --- Test 1: Crewmates correctly vote off the imposter ---
    print("\n-- Test 1: Imposter gets the most votes --")
    vote_game.setVotes()
    vote_game.addVote("p2")  # Alice votes Bob
    vote_game.addVote("p2")  # Charlie votes Bob
    vote_game.addVote("p1")  # Bob votes Alice
    print(f"Votes: {vote_game.getVotes()}")
    result = vote_game.determineWinner()
    print(result)

    # --- Test 2: Crewmate gets voted off, imposter wins ---
    print("\n-- Test 2: Crewmate gets the most votes --")
    vote_game.setVotes()
    vote_game.addVote("p1")  # Bob votes Alice
    vote_game.addVote("p1")  # Charlie votes Alice
    vote_game.addVote("p2")  # Alice votes Bob
    print(f"Votes: {vote_game.getVotes()}")
    result = vote_game.determineWinner()
    print(result)

    # --- Test 3: Tie vote — imposter wins by default ---
    print("\n-- Test 3: Tie vote --")
    vote_game.setVotes()
    vote_game.addVote("p1")  # One vote for Alice
    vote_game.addVote("p2")  # One vote for Bob
    print(f"Votes: {vote_game.getVotes()}")
    result = vote_game.determineWinner()
    print(result )

    # --- Test 4: No votes cast — all tied at 0 (imposter wins) ---
    print("\n-- Test 4: No votes cast --")
    vote_game.setVotes()
    print(f"Votes: {vote_game.getVotes()}")
    result = vote_game.determineWinner()
    print(result)

# --- Test 5: Single player game ---
    print("\n-- Test 5: Single player (is the imposter) --")
    solo_game = Game("solo_test")
    solo = Player(id="s1", websocket=None, userName="Solo")
    solo.role = "imposter"
    solo_game.players = [solo]
    solo_game.setVotes()
    solo_game.addVote("s1")
    print(f"Votes: {solo_game.getVotes()}")
    result = solo_game.determineWinner()
    print(result)