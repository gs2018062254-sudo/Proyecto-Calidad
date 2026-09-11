# -*- coding: utf-8 -*-
"""
Archivo de prueba con diversas vulnerabilidades intencionales.
Usar solamente para validar el analizador SAST.
"""

import sqlite3
import os
import subprocess
import pickle
import hashlib
import random
import yaml
import marshal
import shelve
from Crypto.Cipher import DES, ARC4, DES3
from flask import Flask, request, render_template_string, send_file, Response

app = Flask(__name__)

# =====================================================================
# HARDCODED SECRETS (CWE-798)
# =====================================================================
API_KEY = "sk-abcdefghijklmnopqrstuvwxyz1234567890"
APP_SECRET = "super_secret_password_123!"
AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"
DB_URL = "postgres://admin:password123@localhost:5432/prod"
GITHUB_TOKEN = "ghp_abcdefghijklmnopqrstuvwxyz0123456789"
PRIVATE_KEY = """-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Z9examplefakekey
-----END RSA PRIVATE KEY-----"""


# =====================================================================
# SQL INJECTION (CWE-89)
# =====================================================================
def login_user():
    username = input("Usuario: ")
    password = input("Contraseña: ")
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    # Vulnerable: concatenación directa
    query = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'"
    cursor.execute(query)

    # Vulnerable: f-string
    query2 = f"SELECT * FROM users WHERE id = {username}"
    cursor.execute(query2)

    # Vulnerable: formato %
    safe_param = input("valor: ")
    query3 = "UPDATE users SET name = '%s' WHERE id = 1" % safe_param
    cursor.execute(query3)

    return cursor.fetchone()


# =====================================================================
# COMMAND INJECTION (CWE-78)
# =====================================================================
def ping_host():
    host = input("Host: ")
    os.system(f"ping -c 4 {host}")


def run_cmd_subprocess():
    user_cmd = input("Comando: ")
    subprocess.run(user_cmd, shell=True, check=True)
    subprocess.Popen("ls " + user_cmd, shell=True)
    subprocess.call("grep " + user_cmd, shell=True)
    subprocess.check_output(f"cat {user_cmd}", shell=True)


def dangerous_eval_exec():
    data = input("Código: ")
    eval(data)
    exec(data)
    compile(data, "<string>", "exec")


def insecure_deserialization():
    raw = request.data
    pickle.loads(raw)
    yaml.load(raw)
    marshal.loads(raw)
    shelve.open("data.bin")


# =====================================================================
# PATH TRAVERSAL (CWE-22)
# =====================================================================
@app.route("/download")
def download_file():
    filename = request.args.get("f")
    full_path = "./files/" + filename
    with open(full_path, "rb") as f:
        return f.read()


def remove_file():
    name = input("Archivo a borrar: ")
    os.remove(name)
    os.unlink(name)
    shutil_path = "/tmp/" + name
    import shutil
    shutil.rmtree(shutil_path)
    shutil.copy(name, "/destino")


# =====================================================================
# XSS (CWE-79)
# =====================================================================
@app.route("/greet")
def greet():
    name = request.args.get("name", "amigo")
    template = f"<h1>Bienvenido {name}</h1>"
    return render_template_string(template)


@app.route("/echo")
def echo():
    msg = request.args.get("msg", "")
    return Response(msg)


# =====================================================================
# WEAK CRYPTO (CWE-327, CWE-326, CWE-338)
# =====================================================================
def hash_password_md5(password):
    return hashlib.md5(password.encode()).hexdigest()


def hash_password_sha1(password):
    return hashlib.sha1(password.encode()).hexdigest()


def hash_with_hashlib_new():
    hashlib.new("md4")
    hashlib.new("sha1")


def weak_ciphers():
    key = b"abcdefgh"
    cipher1 = DES.new(key, DES.MODE_ECB)
    cipher2 = ARC4.new(key)
    cipher3 = DES3.new(b"1234567812345678", DES3.MODE_ECB)
    return cipher1, cipher2, cipher3


def insecure_random():
    token = random.randint(0, 1000000)
    choice = random.choice(["a", "b", "c"])
    return str(token), choice


def password_stored_as_hash_general():
    password = request.form.get("password")
    password = hashlib.sha256(password.encode()).hexdigest()
    return password


def small_rsa_key():
    rsa_key_size = 1024
    key_bits = 512
    return rsa_key_size, key_bits


# =====================================================================
# USO NO VULNERABLE (para probar falsos positivos)
# =====================================================================
def secure_code():
    # Consulta parametrizada - no debe detectarse como SQLi
    cursor = None
    user = "admin"
    cursor.execute("SELECT * FROM users WHERE name = ?", (user,))

    # subprocess sin shell=True - no debe detectarse como Command Injection
    subprocess.run(["ping", "-c", "1", "localhost"])

    # secrets en vez de random
    import secrets
    token = secrets.token_hex(16)
    return token


if __name__ == "__main__":
    app.run()
