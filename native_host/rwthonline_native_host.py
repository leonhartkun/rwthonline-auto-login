#!/usr/bin/env python3
"""Native messaging host for RWTHonline Auto Login.

It stores the user's credentials in the operating system credential vault and
only returns them to the Chrome extension registered by its installer.
"""

import base64
import hashlib
import hmac
import json
import os
import struct
import subprocess
import sys
import time

SERVICE_PREFIX = "rwthonline-auto-login"
SESSION_CACHE = {}


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
    SESSION_CACHE.clear()


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


def configure(message):
    fields = ("username", "password", "totp_secret", "totp_algorithm", "totp_digits", "totp_period")
    for field in fields:
        value = message.get(field)
        if value is None or value == "":
            raise ValueError(f"Missing {field}.")
        vault_write(field, str(value))
        SESSION_CACHE[field] = str(value)
    return {"ok": True}


def handle(message):
    action = message.get("action")
    if action == "configure_credentials":
        return configure(message)
    if action == "get_credentials":
        return {"username": cached_vault_read("username"), "password": cached_vault_read("password")}
    if action == "get_totp":
        return {"code": current_totp_code(cached_vault_read("totp_secret"), cached_vault_read("totp_digits"),
                                             cached_vault_read("totp_period"), cached_vault_read("totp_algorithm"))}
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
