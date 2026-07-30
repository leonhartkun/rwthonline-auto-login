#!/usr/bin/env python3
"""Native messaging host for RWTHonline Auto Login.

It stores the user's credentials in the operating system credential vault and
only returns them to the Chrome extension registered by its installer.
"""

import base64
import hashlib
import hmac
import json
import io
import os
import struct
import subprocess
import sys
import time
from urllib.parse import parse_qs, unquote, urlparse

SERVICE_PREFIX = "rwthonline-auto-login"
LOGIN_DATA_NAME = "login-data-v1"
SESSION_CACHE = {}
PENDING_TOTP_IMPORT = None


def service_name(name):
    return f"{SERVICE_PREFIX}.{name}"


def macos_write(name, value):
    subprocess.run(
        ["security", "add-generic-password", "-U", "-a", SERVICE_PREFIX,
         "-s", service_name(name), "-w", value],
        check=True, capture_output=True, text=True,
    )


def macos_read(name):
    result = subprocess.run(
        ["security", "find-generic-password", "-a", SERVICE_PREFIX,
         "-s", service_name(name), "-w"],
        check=True, capture_output=True, text=True,
    )
    return result.stdout.strip()


def windows_api():
    import ctypes
    from ctypes import wintypes

    class CREDENTIALW(ctypes.Structure):
        _fields_ = [("Flags", wintypes.DWORD), ("Type", wintypes.DWORD),
                   ("TargetName", wintypes.LPWSTR), ("Comment", wintypes.LPWSTR),
                   ("LastWritten", ctypes.c_byte * 8), ("CredentialBlobSize", wintypes.DWORD),
                   ("CredentialBlob", ctypes.POINTER(ctypes.c_byte)), ("Persist", wintypes.DWORD),
                   ("AttributeCount", wintypes.DWORD), ("Attributes", ctypes.c_void_p),
                   ("TargetAlias", wintypes.LPWSTR), ("UserName", wintypes.LPWSTR)]

    advapi32 = ctypes.WinDLL("Advapi32.dll")
    advapi32.CredWriteW.argtypes = [ctypes.POINTER(CREDENTIALW), wintypes.DWORD]
    advapi32.CredWriteW.restype = wintypes.BOOL
    advapi32.CredReadW.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD,
                                   ctypes.POINTER(ctypes.POINTER(CREDENTIALW))]
    advapi32.CredReadW.restype = wintypes.BOOL
    advapi32.CredFree.argtypes = [ctypes.c_void_p]
    return ctypes, advapi32, CREDENTIALW


def windows_write(name, value):
    ctypes, advapi32, credential_type = windows_api()
    encoded = value.encode("utf-8")
    buffer = (ctypes.c_byte * len(encoded)).from_buffer_copy(encoded)
    credential = credential_type()
    credential.Type = 1  # CRED_TYPE_GENERIC
    credential.TargetName = service_name(name)
    credential.CredentialBlobSize = len(encoded)
    credential.CredentialBlob = ctypes.cast(buffer, ctypes.POINTER(ctypes.c_byte))
    credential.Persist = 2  # CRED_PERSIST_LOCAL_MACHINE
    credential.UserName = SERVICE_PREFIX
    if not advapi32.CredWriteW(ctypes.byref(credential), 0):
        raise OSError("Windows Credential Manager rejected the saved credential.")


def windows_read(name):
    ctypes, advapi32, credential_type = windows_api()
    pointer = ctypes.POINTER(credential_type)()
    if not advapi32.CredReadW(service_name(name), 1, 0, ctypes.byref(pointer)):
        raise RuntimeError("Credential not found in Windows Credential Manager.")
    try:
        blob = ctypes.string_at(pointer.contents.CredentialBlob,
                                pointer.contents.CredentialBlobSize)
        return blob.decode("utf-8")
    finally:
        advapi32.CredFree(pointer)


def vault_write(name, value):
    if sys.platform == "darwin":
        macos_write(name, value)
    elif sys.platform == "win32":
        windows_write(name, value)
    else:
        raise RuntimeError("This helper currently supports macOS and Windows only.")


def vault_read(name):
    if sys.platform == "darwin":
        return macos_read(name)
    if sys.platform == "win32":
        return windows_read(name)
    raise RuntimeError("This helper currently supports macOS and Windows only.")


def clear_session_cache():
    global PENDING_TOTP_IMPORT
    SESSION_CACHE.clear()
    PENDING_TOTP_IMPORT = None


def cached_vault_read(name):
    if name not in SESSION_CACHE:
        SESSION_CACHE[name] = vault_read(name)
    return SESSION_CACHE[name]


def current_totp_code(secret, digits=6, period=30, algorithm="SHA-1"):
    normalized = secret.upper().replace(" ", "").replace("=", "")
    key = base64.b32decode(normalized + "=" * (-len(normalized) % 8))
    counter = int(time.time() // int(period)).to_bytes(8, "big")
    digest_name = algorithm.lower().replace("-", "")
    digest = hmac.new(key, counter, getattr(hashlib, digest_name)).digest()
    offset = digest[-1] & 0x0F
    code = (int.from_bytes(digest[offset:offset + 4], "big") & 0x7FFFFFFF) % (10 ** int(digits))
    return str(code).zfill(int(digits))


def decode_otpauth_from_image(image_base64):
    try:
        from PIL import Image
        import zxingcpp
    except ImportError as error:
        raise RuntimeError("This helper build does not include local QR decoding.") from error

    try:
        image_data = base64.b64decode(image_base64, validate=True)
        image = Image.open(io.BytesIO(image_data))
        results = zxingcpp.read_barcodes(image)
    except Exception as error:
        raise ValueError("The selected image could not be read as a QR code.") from error
    if not results:
        raise ValueError("No TOTP QR code was found in the selected image.")
    return results[0].text


def parse_totp_uri(uri):
    parsed = urlparse(uri)
    if parsed.scheme.lower() != "otpauth" or parsed.netloc.lower() != "totp":
        raise ValueError("The selected QR code is not an otpauth TOTP token.")
    parameters = parse_qs(parsed.query)
    secret = parameters.get("secret", [""])[0].strip()
    if not secret:
        raise ValueError("The selected TOTP QR code has no secret.")
    try:
        digits = int(parameters.get("digits", ["6"])[0])
        period = int(parameters.get("period", ["30"])[0])
    except ValueError as error:
        raise ValueError("The selected TOTP QR code has invalid settings.") from error
    if digits < 1 or period < 1:
        raise ValueError("The selected TOTP QR code has invalid settings.")
    algorithm = parameters.get("algorithm", ["SHA-1"])[0].upper()
    digest_name = algorithm.lower().replace("-", "")
    if not hasattr(hashlib, digest_name):
        raise ValueError("The selected TOTP QR code uses an unsupported algorithm.")
    label = unquote(parsed.path.lstrip("/")) or "RWTH Token"
    return {
        "secret": secret,
        "algorithm": algorithm,
        "digits": digits,
        "period": period,
        "label": label,
    }


def preview_import():
    if not PENDING_TOTP_IMPORT:
        raise ValueError("Select the Token QR image again.")
    return {
        "ok": True,
        "token_label": PENDING_TOTP_IMPORT["label"],
        "code": current_totp_code(
            PENDING_TOTP_IMPORT["secret"],
            PENDING_TOTP_IMPORT["digits"],
            PENDING_TOTP_IMPORT["period"],
            PENDING_TOTP_IMPORT["algorithm"],
        ),
        "period": PENDING_TOTP_IMPORT["period"],
    }


def import_token_qr(message):
    global PENDING_TOTP_IMPORT
    image_base64 = message.get("image_base64", "")
    if not image_base64:
        raise ValueError("Select a Token QR image.")
    PENDING_TOTP_IMPORT = parse_totp_uri(decode_otpauth_from_image(image_base64))
    return preview_import()


def configure(message):
    global PENDING_TOTP_IMPORT
    if message.get("use_imported_token"):
        if not PENDING_TOTP_IMPORT:
            raise ValueError("Select the Token QR image again.")
        message = {
            **message,
            "totp_secret": PENDING_TOTP_IMPORT["secret"],
            "totp_algorithm": PENDING_TOTP_IMPORT["algorithm"],
            "totp_digits": PENDING_TOTP_IMPORT["digits"],
            "totp_period": PENDING_TOTP_IMPORT["period"],
        }
    fields = ("username", "password", "totp_secret", "totp_algorithm", "totp_digits", "totp_period", "token_label")
    saved = {}
    for field in fields:
        value = message.get(field, "Selfload" if field == "token_label" else None)
        if value is None or value == "":
            raise ValueError(f"Missing {field}.")
        vault_write(field, str(value))
        SESSION_CACHE[field] = str(value)
        saved[field] = str(value)
    vault_write(LOGIN_DATA_NAME, json.dumps(saved))
    SESSION_CACHE[LOGIN_DATA_NAME] = saved
    PENDING_TOTP_IMPORT = None
    return {"ok": True}


def login_data():
    if LOGIN_DATA_NAME not in SESSION_CACHE:
        try:
            SESSION_CACHE[LOGIN_DATA_NAME] = json.loads(vault_read(LOGIN_DATA_NAME))
        except Exception:
            fields = ("username", "password", "totp_secret", "totp_algorithm", "totp_digits", "totp_period")
            migrated = {field: cached_vault_read(field) for field in fields}
            vault_write(LOGIN_DATA_NAME, json.dumps(migrated))
            SESSION_CACHE[LOGIN_DATA_NAME] = migrated
    return SESSION_CACHE[LOGIN_DATA_NAME]


def handle(message):
    action = message.get("action")
    if action == "configure_credentials":
        return configure(message)
    if action == "get_login_data":
        return login_data()
    if action == "get_credentials":
        data = login_data()
        return {"username": data["username"], "password": data["password"]}
    if action == "get_totp":
        data = login_data()
        return {"code": current_totp_code(data["totp_secret"], data["totp_digits"],
                                             data["totp_period"], data["totp_algorithm"])}
    if action == "import_token_qr":
        return import_token_qr(message)
    if action == "get_imported_totp":
        return preview_import()
    if action == "get_helper_status":
        return {"ok": True, "platform": sys.platform}
    raise ValueError("Unsupported action.")


def read_message():
    raw_length = sys.stdin.buffer.read(4)
    if not raw_length:
        return None
    raw = sys.stdin.buffer.read(struct.unpack("<I", raw_length)[0])
    return json.loads(raw.decode("utf-8"))


def send_message(payload):
    encoded = json.dumps(payload).encode("utf-8")
    sys.stdout.buffer.write(struct.pack("<I", len(encoded)) + encoded)
    sys.stdout.buffer.flush()


def main():
    while True:
        message = read_message()
        if message is None:
            return
        try:
            response = handle(message)
        except Exception as error:
            response = {"error": str(error)}
        if "request_id" in message:
            response["request_id"] = message["request_id"]
        send_message(response)


if __name__ == "__main__":
    main()
