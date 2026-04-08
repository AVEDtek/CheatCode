import json
import tempfile
import os
import subprocess
import sys
import textwrap
import ast
import requests


def get_first_function_name(code):
    try:
        tree = ast.parse(code)
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                return node.name
    except:
        pass
    return None

class Results:
    def __init__(self, returncode, stdout, stderr, tests):
        self.returncode = returncode
        self.stdout = stdout
        self.stderr = stderr
        self.tests = tests

class TestRunner:
    def __init__(self, tests):
        self.tests = tests

    def run_tests(self, code):
        #check if server is running. if not run locally (for dev, in production this should throw a server error that we can catch and display to the user)
        url = "http://127.0.0.1:8000/status"
        try:
            response = requests.post(url)
            response = response.json()
            if response.get("status") == "ok":
                return self.execute_tests(code)
            else:
                return self.locally_execute_tests(code)
        except requests.exceptions.RequestException as e:
            print("Server not reachable, running tests locally:", e)
            return self.locally_execute_tests(code)        
        
    def execute_tests(self, code):
        url = "http://127.0.0.1:8000/execute"
        payload = {
            "code": code, 
            "function_name": get_first_function_name(code),
            "test_cases": self.tests
            }
        
        response = requests.post(url, json=payload).json()
        if response["status"] != "success":
            return Results(
                returncode=1,
                stdout="",
                stderr=response['stderr'],
                tests={'passed': False, 'results': []}
            )
        result = Results(
            returncode=response.get("returncode"),
            stdout=response.get("stdout"),
            stderr=response.get("stderr"),
            tests=response.get("tests"))
        return result

    def locally_execute_tests(self, code): #Should be for dev only, not used in production
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
                        inp = t.get("input")

                        def looks_like_kwarg_pairs(value):
                            if not isinstance(value, (list, tuple)):
                                return False
                            if len(value) == 0:
                                return False
                            for item in value:
                                if not isinstance(item, (list, tuple)):
                                    return False
                                if len(item) != 2:
                                    return False
                                if not isinstance(item[0], str):
                                    return False
                            return True

                        if isinstance(inp, dict):
                            output = func(**inp)
                        elif looks_like_kwarg_pairs(inp):
                            output = func(**dict(inp))
                        elif isinstance(inp, (list, tuple)):
                            output = func(*inp)
                        elif inp is None:
                            output = func()
                        else:
                            output = func(inp)
                        results.append({{
                            "input": t["input"],
                            "expected": t["expected"],
                            "output": output,
                            "passed": output == t["expected"]
                        }})
                    except Exception as e:
                        results.append({{
                            "input": t.get("input"),
                            "expected": t["expected"],
                            "output": str(e),
                            "passed": False
                        }})

                print(json.dumps(results, ensure_ascii=False))

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

            parsed_results = []
            if result.stdout.strip():
                try:
                    parsed_results = json.loads(result.stdout)
                except json.JSONDecodeError:
                    pass

            result_data = Results(
                returncode=result.returncode,
                stdout=result.stdout,
                stderr=result.stderr,
                tests={'passed': False, 'results': parsed_results}
            )
            return result_data