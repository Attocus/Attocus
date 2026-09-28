#!/usr/bin/env python3
"""
Attocus Master Test Runner & Demo Validation Suite.
Executes all unit, integration, guardrail, and DeepEval evaluation tests
with a presentation-ready report.

Usage:
    python run_all_tests.py           # Runs full suite including DeepEval LLM evaluation
    python run_all_tests.py --fast    # Fast offline checks only (skips live LLM calls)
"""

import sys
import os
import time
import subprocess
from dotenv import load_dotenv

# Ensure backend root is on PYTHONPATH and env loaded
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)
load_dotenv(os.path.join(backend_dir, ".env"))


def print_banner(fast_mode: bool = False):
    mode_text = " (FAST MODE - Offline Checks)" if fast_mode else " (FULL SUITE with DeepEval)"
    banner = rf"""
===============================================================================
       _   _____ _____ ___   ____ _   _ ____  
      / \ |_   _|_   _/ _ \ / ___| | | / ___| 
     / _ \  | |   | || | | | |   | | | \___ \ 
    / ___ \ | |   | || |_| | |___| |_| |___) |
   /_/   \_\|_|   |_| \___/ \____|\___/|____/ 
                                               
   ATTOCUS MULTI-AGENT VERIFICATION & AUTOMATED TEST SUITE{mode_text}
   Responsible AI Guardrails • Edge Computer Vision • DeepEval RAG Faithfulness
===============================================================================
"""
    print(banner)


def run_test_module(module_path: str, title: str) -> tuple[int, int, int, float]:
    print(f"\n[RUNNING] 🚀 {title}")
    print("-" * 79)
    start_time = time.time()
    
    cmd = [
        sys.executable, "-m", "pytest",
        module_path,
        "-v",
        "--tb=short",
        "-W", "ignore::DeprecationWarning",
        "-W", "ignore::FutureWarning"
    ]
    
    env = os.environ.copy()
    env["PYTHONPATH"] = backend_dir + (f":{env['PYTHONPATH']}" if "PYTHONPATH" in env else "")
    
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        cwd=backend_dir,
        env=env
    )
    elapsed = time.time() - start_time
    
    passed_count = 0
    failed_count = 0
    skipped_count = 0
    
    for line in result.stdout.splitlines():
        if "PASSED" in line:
            passed_count += 1
            test_name = line.split("::")[-1].split()[0]
            print(f"  ✔ {test_name:<55} [PASSED]")
        elif "SKIPPED" in line:
            skipped_count += 1
            test_name = line.split("::")[-1].split()[0]
            print(f"  ⏭ {test_name:<55} [SKIPPED]")
        elif "FAILED" in line:
            failed_count += 1
            test_name = line.split("::")[-1].split()[0]
            print(f"  ✖ {test_name:<55} [FAILED]")
            
    if failed_count > 0:
        print(f"\n[ERROR DETAILS] for {title}:")
        print(result.stdout)
        print(result.stderr)
        
    return passed_count, failed_count, skipped_count, elapsed


def main():
    fast_mode = "--fast" in sys.argv
    print_banner(fast_mode=fast_mode)
    
    tests = [
        ("tests/test_guardrails.py", "Responsible AI Guardrails & Security Layers"),
        ("tests/test_agents.py", "Multi-Agent System & Cognitive Orchestration"),
        ("tests/test_vision_logic.py", "Computer Vision Heuristics & Distraction Matrix"),
        ("tests/test_file_validation.py", "Lecture Ingestion & Strict PDF Validation"),
    ]
    
    if not fast_mode:
        tests.append(("tests/test_eval.py", "DeepEval Live Hallucination & Faithfulness Evaluation"))
    
    total_passed = 0
    total_failed = 0
    total_skipped = 0
    total_time = 0.0
    
    for path, title in tests:
        passed, failed, skipped, elapsed = run_test_module(path, title)
        total_passed += passed
        total_failed += failed
        total_skipped += skipped
        total_time += elapsed
        
    total_tests = total_passed + total_failed
    pass_rate = (total_passed / total_tests * 100.0) if total_tests > 0 else 0.0
    
    print("\n" + "=" * 79)
    print("                      📊 SYSTEM VERIFICATION SUMMARY REPORT")
    print("=" * 79)
    print(f"  Total Test Cases Executed : {total_tests}")
    print(f"  Passed Checks             : {total_passed} ✔")
    if total_skipped > 0:
        print(f"  Skipped Checks            : {total_skipped} ⏭")
    print(f"  Failed Checks             : {total_failed} ✖")
    print(f"  Pass Rate                 : {pass_rate:.1f}%")
    print(f"  Total Execution Time      : {total_time:.2f} seconds")
    print("-" * 79)
    
    if total_failed == 0 and total_tests > 0:
        print("  Status: 🟢 ALL SYSTEMS OPERATIONAL - READY FOR PRESENTATION & DEMO")
    else:
        print("  Status: 🔴 ATTENTION REQUIRED - Some checks failed.")
    print("=" * 79 + "\n")
    
    return 0 if total_failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())

