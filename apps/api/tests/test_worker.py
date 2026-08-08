"""Worker reliability tests: exponential backoff and retry scheduling."""

from __future__ import annotations

from datetime import datetime, timedelta

import sys
import os

# repo root = tests/../../..; worker lives at repo/apps/worker
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "apps", "worker"))

from worker import backoff_for, due_for_retry  # noqa: E402


def test_backoff_is_exponential():
    assert backoff_for(1, base_backoff=5) == 5
    assert backoff_for(2, base_backoff=5) == 10
    assert backoff_for(3, base_backoff=5) == 20
    assert backoff_for(2, base_backoff=2) == 4


def test_due_for_retry_none_timestamp():
    assert due_for_retry(attempts=0, last_attempt_at=None, max_attempts=3) is True


def test_due_for_retry_max_attempts_reached():
    assert due_for_retry(attempts=3, last_attempt_at=None, max_attempts=3) is False


def test_due_for_retry_waits_backoff_window():
    now = datetime.utcnow()
    # attempt 1 -> backoff 5s; only 1s elapsed -> not due
    assert due_for_retry(1, now - timedelta(seconds=1), 3, base_backoff=5, now=now) is False
    # 6s elapsed -> due
    assert due_for_retry(1, now - timedelta(seconds=6), 3, base_backoff=5, now=now) is True


def test_due_for_retry_attempt_2_longer_window():
    now = datetime.utcnow()
    # attempt 2 -> backoff 10s; 6s elapsed -> still not due
    assert due_for_retry(2, now - timedelta(seconds=6), 3, base_backoff=5, now=now) is False
    # 11s elapsed -> due
    assert due_for_retry(2, now - timedelta(seconds=11), 3, base_backoff=5, now=now) is True
