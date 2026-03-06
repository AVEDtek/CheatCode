import json
import tempfile
import os
import subprocess
import sys
import textwrap
import ast

def get_first_function_name(code):
    try:
        tree = ast.parse(code)
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                return node.name
    except:
        pass
    return None

class TestRunner:
    def __init__(self, testCycle):
        self.tests = testCycle

    def run_tests(self, code):
        self.code = code
        with tempfile.TemporaryDirectory() as tmpdir:
            solution_path = os.path.join(tmpdir, "test.py")

            with open(solution_path, "w") as f:
                f.write((self.code or "").replace("\r\n", "\n").replace("\r", "\n"))

            safe_func_name = (get_first_function_name(self.code) or "").strip()
            tests_json = json.dumps(self.tests, ensure_ascii=False)

            runner_code = textwrap.dedent(f"""
                import json
                import test

                FUNC_NAME = {safe_func_name!r}

                tests = json.loads({tests_json!r})
                results = []

                func = getattr(test, FUNC_NAME)

                for t in tests:
                    try:
                        args = dict(t["input"])
                        output = func(**args)
                        results.append({{
                            "input": t["input"],
                            "expected": t["expected"],
                            "output": output,
                            "passed": output == t["expected"]
                        }})
                    except Exception as e:
                        results.append({{
                            "input": t.get("input"),
                            "error": str(e),
                            "passed": False
                        }})

                print(json.dumps(results))
            """).lstrip()

            runner_path = os.path.join(tmpdir, "testRunner.py")
            with open(runner_path, "w") as f:
                f.write(runner_code)

            result = subprocess.run(
                [sys.executable, "testRunner.py"],
                cwd=tmpdir,
                capture_output=True,
                text=True,
                timeout=5
            )

            return result