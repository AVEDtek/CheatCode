#Define types used across the application to ensure consistency and type safety.

from typing import Optional, TypedDict

class TestCases(TypedDict):
    input: list
    expected: any

class Problem(TypedDict):
    id: int
    title: str
    difficulty: str
    description: str
    examples: list[str]
    constraints: list[str]
    topics: list[str]
    code: str

class Results(TypedDict):
    returncode: int
    stdout: str
    stderr: str
    tests: list