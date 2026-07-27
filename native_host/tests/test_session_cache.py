import pathlib
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import rwthonline_native_host as host


class SessionCacheTest(unittest.TestCase):
    def setUp(self):
        host.clear_session_cache()

    def test_credentials_are_read_once_per_helper_session(self):
        with patch.object(host, "vault_read", side_effect=["alice", "secret"]) as read:
            self.assertEqual(
                host.handle({"action": "get_credentials"}),
                {"username": "alice", "password": "secret"},
            )
            self.assertEqual(
                host.handle({"action": "get_credentials"}),
                {"username": "alice", "password": "secret"},
            )

        self.assertEqual(read.call_count, 2)

    def test_main_accepts_more_than_one_native_message(self):
        responses = []
        with patch.object(host, "read_message", side_effect=[
            {"action": "get_helper_status", "request_id": "one"},
            {"action": "get_helper_status", "request_id": "two"},
            None,
        ]), patch.object(host, "send_message", side_effect=responses.append):
            host.main()

        self.assertEqual([response["request_id"] for response in responses], ["one", "two"])


if __name__ == "__main__":
    unittest.main()
