"""Eval harness for User Story 6.2 (the AI assistant).

Runs every golden-set question through the real feature several times, grades
each answer with code, reports each metric as mean/min/max, compares with a
saved baseline, and exits 1 if anything is below its threshold, so CI can
block the merge.

Run from the backend folder (it calls the real Claude API and costs money):
    python evals/run_evals.py
First run only, to save the known-good results as the baseline:
    python evals/run_evals.py --save-baseline
"""

import argparse
import json
import os
import re
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean

EVALS_DIR = Path(__file__).resolve().parent
BACKEND_DIR = EVALS_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(BACKEND_DIR / ".env")  # on your computer; CI uses GitHub Secrets instead

from chat.fish_chat_service import answer_question, make_client  # noqa: E402

# Pass marks, written like requirements (Module 10, Lecture 1, slide 19).
HALLUCINATION_THRESHOLD = 0.90  # share of questions that must pass, in every run
CONSISTENCY_THRESHOLD = 0.90  # share of questions with the same result in all runs
DRIFT_TOLERANCE = 0.10  # how far a mean may fall below the baseline
MAX_WORDS = 120  # the prompt asks for answers under 120 words
# The prompt asks for plain text: no **bold**, # headings, or - / * bullet lines.
MARKDOWN = re.compile(r"\*\*|__|^\s*#{1,6}\s|^\s*[-*]\s", re.MULTILINE)


def mentions(answer, word):
    # Whole word or phrase, any capitalization, plural allowed ("crab" matches "crabs").
    return re.search(rf"\b{re.escape(word)}(s|es)?\b", answer, re.IGNORECASE) is not None


def grade(item, result):
    """Returns a list of problems with one answer. An empty list means it passed."""
    answer = result["answer"]
    problems = []
    if result["source"] == "fallback":
        return ["fallback answer"]
    if len(answer.split()) >= MAX_WORDS:
        problems.append(f"{MAX_WORDS} words or more")
    if MARKDOWN.search(answer):
        problems.append("uses markdown")
    if "exact" in item and answer.strip() != item["exact"]:
        problems.append("not the exact expected reply")
    for group in item.get("must_mention", []):
        if not any(mentions(answer, word) for word in group):
            problems.append(f"mentions none of {group}")
    for text in item.get("must_not_mention", []):
        if text.lower() in answer.lower():
            problems.append(f"contains {text!r}")
    if "must_not_match" in item and re.search(item["must_not_match"], answer, re.IGNORECASE):
        problems.append("states a regulation number")
    return problems


def run_suite(golden, runs):
    client = make_client()
    jobs = [(run, item) for run in range(runs) for item in golden]
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(lambda job: answer_question(job[1]["question"], client), jobs))

    # passed[run][item id] = True or False
    passed = [{} for _ in range(runs)]
    details = []
    for (run, item), result in zip(jobs, results):
        problems = grade(item, result)
        passed[run][item["id"]] = not problems
        details.append({"run": run + 1, "id": item["id"], "question": item["question"],
                        "answer": result["answer"], "source": result["source"], "problems": problems})

    rates = [sum(run.values()) / len(golden) for run in passed]
    consistent = [item["id"] for item in golden if len({run[item["id"]] for run in passed}) == 1]
    return {
        "date": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "model": os.environ.get("LLM_MODEL"),
        "prompt_version": os.environ.get("FISH_CHAT_PROMPT_VERSION", "v2"),
        "runs": runs,
        "questions": len(golden),
        "hallucination_pass_rate": {"mean": mean(rates), "min": min(rates), "max": max(rates)},
        "consistency_rate": len(consistent) / len(golden),
        "details": details,
    }


def check(report, baseline):
    problems = []
    halluc = report["hallucination_pass_rate"]
    if halluc["min"] < HALLUCINATION_THRESHOLD:
        problems.append(f"hallucination pass rate {halluc['min']:.2f} in a run is below {HALLUCINATION_THRESHOLD}")
    if report["consistency_rate"] < CONSISTENCY_THRESHOLD:
        problems.append(f"consistency {report['consistency_rate']:.2f} is below {CONSISTENCY_THRESHOLD}")
    if baseline:
        if halluc["mean"] < baseline["hallucination_pass_rate"]["mean"] - DRIFT_TOLERANCE:
            problems.append("drift: hallucination pass rate fell below the baseline")
        if report["consistency_rate"] < baseline["consistency_rate"] - DRIFT_TOLERANCE:
            problems.append("drift: consistency fell below the baseline")
    return problems


def main():
    parser = argparse.ArgumentParser(description="Run the US 6.2 eval suite.")
    parser.add_argument("--runs", type=int, default=5)
    parser.add_argument("--golden", default=EVALS_DIR / "golden_fish_chat.jsonl")
    parser.add_argument("--baseline", default=EVALS_DIR / "baseline.json")
    parser.add_argument("--output", default=EVALS_DIR / "results.json")
    parser.add_argument("--save-baseline", action="store_true", help="save this run as the new baseline")
    args = parser.parse_args()

    golden = [json.loads(line) for line in Path(args.golden).read_text(encoding="utf-8").splitlines() if line.strip()]
    report = run_suite(golden, args.runs)

    baseline_path = Path(args.baseline)
    baseline = json.loads(baseline_path.read_text(encoding="utf-8")) if baseline_path.exists() else None
    problems = check(report, baseline)
    report["problems"] = problems
    Path(args.output).write_text(json.dumps(report, indent=2), encoding="utf-8")

    halluc = report["hallucination_pass_rate"]
    print(f"Model {report['model']}, prompt {report['prompt_version']}, "
          f"{report['questions']} questions x {report['runs']} runs")
    print(f"Hallucination pass rate: mean {halluc['mean']:.2f}, min {halluc['min']:.2f}, "
          f"max {halluc['max']:.2f} (every run must be >= {HALLUCINATION_THRESHOLD})")
    print(f"Consistency: {report['consistency_rate']:.2f} (must be >= {CONSISTENCY_THRESHOLD})")
    if baseline:
        print(f"Baseline from {baseline['date']}: hallucination mean "
              f"{baseline['hallucination_pass_rate']['mean']:.2f}, consistency {baseline['consistency_rate']:.2f}")
    else:
        print("No baseline yet, so drift was not checked.")
    for detail in report["details"]:
        if detail["problems"]:
            print(f"  run {detail['run']}, question {detail['id']}: {'; '.join(detail['problems'])}")
    print(f"Full results: {args.output}")

    if args.save_baseline:
        if problems:
            print("Not saving the baseline: this run did not pass.")
        else:
            summary = {key: report[key] for key in report if key not in ("details", "problems")}
            baseline_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
            print(f"Saved baseline: {baseline_path}")

    if problems:
        print("FAIL:")
        for problem in problems:
            print(f"  - {problem}")
        sys.exit(1)
    print("PASS")


if __name__ == "__main__":
    main()
