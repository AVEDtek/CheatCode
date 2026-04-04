#Define types used across the application to ensure consistency and type safety.

from typing import Optional, TypedDict

class Constraints(TypedDict):
    allow_division: bool

class TestCases(TypedDict):
    input: list
    expected: any

class Problem(TypedDict):
    id: int
    title: str
    difficulty: str
    description: str
    examples: list
    constraints: list
    topics: list
    code: str

class Results:
    def __init__(self, returncode, stdout, stderr, tests):
        self.returncode : int = returncode
        self.stdout : str = stdout
        self.stderr : str = stderr
        self.tests = tests