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

    def test_configure_keeps_the_user_selected_token_label(self):
        message = {
            "action": "configure_credentials",
            "username": "alice",
            "password": "secret",
            "totp_secret": "JBSWY3DPEHPK3PXP",
            "totp_algorithm": "SHA-1",
            "totp_digits": "6",
            "totp_period": "30",
            "token_label": "PITN693767FF - TAN - 050825",
        }
        with patch.object(host, "vault_write"):
            self.assertEqual(host.handle(message), {"ok": True})

        self.assertEqual(host.handle({"action": "get_login_data"})["token_label"], message["token_label"])

    def test_import_token_qr_keeps_secret_out_of_response(self):
        with patch.object(
            host,
            "decode_otpauth_from_image",
            return_value="otpauth://totp/RWTH:test?secret=JBSWY3DPEHPK3PXP",
        ):
            response = host.handle({"action": "import_token_qr", "image_base64": "cG5n"})

        self.assertTrue(response["ok"])
        self.assertIn("code", response)
        self.assertEqual(response["token_label"], "RWTH:test")
        self.assertNotIn("totp_secret", response)

    def test_get_imported_totp_requires_an_import(self):
        with self.assertRaisesRegex(ValueError, "Select the Token QR image again"):
            host.handle({"action": "get_imported_totp"})

    def test_import_rejects_a_non_totp_uri(self):
        with patch.object(host, "decode_otpauth_from_image", return_value="https://example.invalid"):
            with self.assertRaisesRegex(ValueError, "otpauth"):
                host.handle({"action": "import_token_qr", "image_base64": "cG5n"})

    def test_configure_consumes_pending_import_without_receiving_secret(self):
        host.PENDING_TOTP_IMPORT = {
            "secret": "JBSWY3DPEHPK3PXP",
            "algorithm": "SHA-1",
            "digits": 6,
            "period": 30,
            "label": "RWTH:test",
        }
        message = {
            "action": "configure_credentials",
            "username": "alice",
            "password": "secret",
            "token_label": "test",
            "use_imported_token": True,
        }
        with patch.object(host, "vault_write") as write:
            response = host.handle(message)

        self.assertEqual(response, {"ok": True})
        self.assertTrue(any("JBSWY3DPEHPK3PXP" in str(call) for call in write.call_args_list))
        self.assertIsNone(host.PENDING_TOTP_IMPORT)


if __name__ == "__main__":
    unittest.main()
