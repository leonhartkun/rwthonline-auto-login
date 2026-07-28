import pathlib
import sys
import unittest
import json
from unittest.mock import patch

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import rwthonline_native_host as host


class SessionCacheTest(unittest.TestCase):
    def setUp(self):
        host.clear_session_cache()

    def test_credentials_are_read_once_per_helper_session(self):
        saved = {"username": "alice", "password": "secret", "totp_secret": "seed",
                 "totp_algorithm": "SHA-1", "totp_digits": "6", "totp_period": "30"}
        with patch.object(host, "vault_read", return_value=json.dumps(saved)) as read:
            self.assertEqual(
                host.handle({"action": "get_credentials"}),
                {"username": "alice", "password": "secret"},
            )
            self.assertEqual(
                host.handle({"action": "get_credentials"}),
                {"username": "alice", "password": "secret"},
            )

        self.assertEqual(read.call_count, 1)

    def test_main_accepts_more_than_one_native_message(self):
        responses = []
        with patch.object(host, "read_message", side_effect=[
            {"action": "get_helper_status", "request_id": "one"},
            {"action": "get_helper_status", "request_id": "two"},
            None,
        ]), patch.object(host, "send_message", side_effect=responses.append):
            host.main()

        self.assertEqual([response["request_id"] for response in responses], ["one", "two"])

    def test_login_data_uses_one_combined_vault_record(self):
        saved = {
            "username": "alice",
            "password": "secret",
            "totp_secret": "JBSWY3DPEHPK3PXP",
            "totp_algorithm": "SHA-1",
            "totp_digits": "6",
            "totp_period": "30",
        }
        with patch.object(host, "vault_read", return_value=json.dumps(saved)) as read:
            self.assertEqual(host.handle({"action": "get_login_data"}), saved)

        self.assertEqual(read.call_count, 1)


if __name__ == "__main__":
    unittest.main()
