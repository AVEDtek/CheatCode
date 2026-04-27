import json
import tempfile
import os
import subprocess
import sys
import textwrap
import ast
import requests
import time
from pathlib import Path

from dotenv import load_dotenv

from backend.models.types import Results


def _load_env_vars() -> None:
    # Support both repo-level .env and backend/.env for local development.
    repo_root_env = Path(__file__).resolve().parents[2] / ".env"
    backend_env = Path(__file__).resolve().parents[1] / ".env"
    load_dotenv(dotenv_path=repo_root_env)
    load_dotenv(dotenv_path=backend_env)


_load_env_vars()


def get_first_function_name(code):
    try:
        tree = ast.parse(code)
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                return node.name
    except SyntaxError:
        print("Error parsing code to get function name")
        return None
    except Exception:
        print("Unexpected error parsing code to get function name")
        return None

    return None


class TestRunner:
    def __init__(self, testCases, constraints):
        self.tests = testCases
        self.constraints = constraints
        self.allow_local_execution = os.getenv("ALLOW_LOCAL_TEST_EXECUTION", "true").strip().lower() in {
            "1", "true", "yes", "on"
        }
        self.api_key = os.getenv("CHEATCODE_ENGINE_API_KEY")
        self.execution_poll_interval_seconds = float(os.getenv("EXECUTION_POLL_INTERVAL_SECONDS", "0.25"))
        self.execution_poll_timeout_seconds = float(os.getenv("EXECUTION_POLL_TIMEOUT_SECONDS", "12"))
        self.request_headers = {}
        if self.api_key:
            self.request_headers["X-API-Key"] = self.api_key

    def _local_execution_disabled_result(self):
        return {
            "returncode": 1,
            "stdout": "",
            "stderr": "Local execution is disabled by server policy",
            "tests": {'passed': False, 'results': []}
        }

    def _execution_error_result(self, message):
        return {
            "returncode": 1,
            "stdout": "",
            "stderr": message,
            "tests": {'passed': False, 'results': []}
        }

    def _extract_job_id(self, response):
        if not isinstance(response, dict):
            return None
        return response.get("job_id")

    def _is_terminal_execution_response(self, response):
        if not isinstance(response, dict):
            return False

        status = (response.get("status") or "").lower()
        state = (response.get("state") or "").lower()
        in_progress_statuses = {"queued", "pending", "running", "processing", "in_progress"}
        terminal_statuses = {"success", "completed", "done", "timeout", "constraint_violation", "error", "failed"}
        in_progress_states = {"pending", "started"}
        terminal_states = {"failure", "success"}

        if status in in_progress_statuses:
            return False
        if status in terminal_statuses:
            return True
        if state in in_progress_states:
            return False
        if state in terminal_states:
            return True

        if response.get("done") is True or response.get("completed") is True:
            return True

        result_payload = response.get("result")
        if isinstance(result_payload, dict):
            result_status = (result_payload.get("status") or "").lower()
            if result_status in in_progress_statuses:
                return False
            return True

        # Backward compatibility with direct final responses.
        return any(key in response for key in ["returncode", "tests", "passed", "stderr"])

    def _normalize_execution_result(self, response):
        payload = response.get("result") if isinstance(response.get("result"), dict) else response
        payload_status = (payload.get("status") or "").lower() if isinstance(payload, dict) else ""
        response_status = (response.get("status") or "").lower()
        state = (response.get("state") or "").lower()
        status = payload_status or response_status

        if state == "failure":
            return self._execution_error_result(response.get("error") or str(response.get("info") or "Task failed"))
        if state in {"pending", "started"}:
            return self._execution_error_result("Test execution is not complete yet")

        if status in {"timeout"}:
            return self._execution_error_result("Test execution timed out")
        if status in {"constraint_violation"}:
            return self._execution_error_result(payload.get("stderr", "Constraint violation"))
        if status in {"error", "failed"}:
            return self._execution_error_result(payload.get("error") or payload.get("stderr") or "Unknown error from test execution server")

        if status not in {"", "success", "completed", "done"}:
            return self._execution_error_result(payload.get("error") or payload.get("stderr") or "Unknown error from test execution server")

        raw_tests = payload.get("tests", []) if isinstance(payload, dict) else []
        if isinstance(raw_tests, dict):
            test_results = raw_tests.get("results", [])
            passed = raw_tests.get("passed", False)
        else:
            test_results = raw_tests if isinstance(raw_tests, list) else []
            passed = payload.get("passed", False)

        result : Results = {
            "returncode": payload.get("returncode", 0),
            "stdout": payload.get("stdout", ""),
            "stderr": payload.get("stderr", ""),
            "tests": {"passed": bool(passed), "results": test_results}
        }
        return result

    def run_tests(self, code):
        #check if server is running. if not run locally (for dev, in production this should throw a server error that we can catch and display to the user)
        url = "http://127.0.0.1:8001/status"
        try:
            response = requests.get(url, headers=self.request_headers, timeout=2)
            print("status route:", response.status_code, response.text)
            response.raise_for_status()
            response = response.json()
            if response.get("healthy") == True:
                return self.execute_tests(code)
            else:
                print("Server status check failed, running tests locally")
                print(response)
                if not self.allow_local_execution:
                    return self._local_execution_disabled_result()
                return self.locally_execute_tests(code)
        except requests.exceptions.RequestException as e:
            print("Server not reachable, running tests locally:", e)
            if not self.allow_local_execution:
                return self._local_execution_disabled_result()
            return self.locally_execute_tests(code)
        except ValueError as e:
            print("Invalid JSON from status endpoint, running tests locally:", e)
            if not self.allow_local_execution:
                return self._local_execution_disabled_result()
            return self.locally_execute_tests(code)
        
    def execute_tests(self, code):
        url = "http://127.0.0.1:8001/execute"
        function_name = get_first_function_name(code)
        if not function_name:
            return {
                "returncode": 1,
                "stdout": "",
                "stderr": "No function definition found in submitted code",
                "tests": {'passed': False, 'results': []}
            }

        payload = {
            "code": code, 
            "function_name": function_name,
            "test_cases": self.tests,
            "constraints": self.constraints
        }

        try:
            response = requests.post(url, json=payload, headers=self.request_headers, timeout=8)
            print("Execute route response:", response.status_code, response.text)
            response.raise_for_status()
            response = response.json()
        except requests.exceptions.HTTPError:
            status_code = response.status_code if response is not None else "unknown"
            response_text = response.text if response is not None else ""
            return self._execution_error_result(f"Execution server returned HTTP {status_code}: {response_text}")
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
            print("Remote execution unavailable, running tests locally:", e)
            if not self.allow_local_execution:
                return self._local_execution_disabled_result()
            return self.locally_execute_tests(code)
        except requests.exceptions.RequestException as e:
            return self._execution_error_result(f"Execution request failed: {e}")
        except ValueError as e:
            return self._execution_error_result(f"Invalid JSON from test execution server: {e}")

        # New contract: /execute returns a job id, then /result/{job_id} is polled.
        job_id = self._extract_job_id(response)
        if job_id:
            poll_url = f"http://127.0.0.1:8001/result/{job_id}"
            deadline = time.monotonic() + self.execution_poll_timeout_seconds
            while True:
                if time.monotonic() >= deadline:
                    return self._execution_error_result("Timed out while waiting for test execution job completion")
                try:
                    poll_response = requests.get(poll_url, headers=self.request_headers, timeout=8)
                    poll_response.raise_for_status()
                    response = poll_response.json()
                except requests.exceptions.RequestException as e:
                    return self._execution_error_result(f"Failed to fetch execution job status: {e}")
                except ValueError as e:
                    return self._execution_error_result(f"Invalid JSON from test status endpoint: {e}")

                if self._is_terminal_execution_response(response):
                    break

                time.sleep(max(0.05, self.execution_poll_interval_seconds))

        return self._normalize_execution_result(response)

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
                FUNC_NAME = {safe_func_name!r}
                tests = json.loads({tests_json!r})
                results = []

                def safe_json(value):
                    try:
                        json.dumps(value)
                        return value
                    except TypeError:
                        return repr(value)

                try:
                    import test
                except Exception as e:
                    for t in tests:
                        results.append({{
                            "input": t.get("input"),
                            "expected": t.get("expected"),
                            "output": f"Import error: {{e}}",
                            "passed": False
                        }})
                    print(json.dumps(results))
                    raise SystemExit(0)

                if not FUNC_NAME:
                    for t in tests:
                        results.append({{
                            "input": t.get("input"),
                            "expected": t.get("expected"),
                            "output": "No function definition found",
                            "passed": False
                        }})
                    print(json.dumps(results))
                    raise SystemExit(0)

                try:
                    func = getattr(test, FUNC_NAME)
                except Exception as e:
                    for t in tests:
                        results.append({{
                            "input": t.get("input"),
                            "expected": t.get("expected"),
                            "output": f"Function lookup error: {{e}}",
                            "passed": False
                        }})
                    print(json.dumps(results))
                    raise SystemExit(0)

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
                            "output": safe_json(output),
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

            try:
                result = subprocess.run(
                    [sys.executable, "testRunner.py"],
                    cwd=tmpdir,
                    capture_output=True,
                    text=True,
                    timeout=5
                )
            except subprocess.TimeoutExpired:
                return {
                    "returncode": 1,
                    "stdout": "",
                    "stderr": "Local test execution timed out",
                    "tests": {'passed': False, 'results': []}
                }

            try:
                parsed_results = json.loads(result.stdout) if result.stdout.strip() else []
            except json.JSONDecodeError:
                parsed_results = []

            all_passed = bool(parsed_results) and all(
                test_result.get("passed") is True for test_result in parsed_results
            )

            result_data : Results = {
                "returncode": result.returncode,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "tests": {'passed': all_passed, 'results': parsed_results}
            }
            return result_data