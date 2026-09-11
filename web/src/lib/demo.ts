export const DEMO_SOURCE = `# -*- coding: utf-8 -*-
"""Ejemplo completo de código vulnerable para probar SAST Studio.
Contiene: SQLi, Command Injection, Path Traversal, XSS, Hardcoded Secrets,
Weak Crypto, Insecure Deserialization, Dangerous Functions y más."""

import sqlite3
import os
import subprocess
import pickle
import hashlib
import random
from flask import Flask, request, render_template_string, send_file, Response

app = Flask(__name__)

# =========================================================================
# SECRETOS HARDCODEADOS (CWE-798)
# =========================================================================
API_KEY = "sk-abcdefghijklmnopqrstuvwxyz1234567890"
APP_SECRET = "super_secret_password_123!"
AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"
DB_URL = "postgres://admin:password123@localhost:5432/prod"
GITHUB_TOKEN = "ghp_abcdefghijklmnopqrstuvwxyz0123456789"
PRIVATE_KEY = """-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Z9examplefakekey
-----END RSA PRIVATE KEY-----"""


# =========================================================================
# SQL INJECTION (CWE-89)
# =========================================================================
@app.route("/login", methods=["POST"])
def login_user():
    username = request.form.get("username", "")
    password = request.form.get("password", "")
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    # Vulnerable: concatenación directa
    query = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'"
    cursor.execute(query)

    # Vulnerable: f-string
    query2 = f"SELECT * FROM accounts WHERE id = {username}"
    cursor.execute(query2)

    return str(cursor.fetchone())


# =========================================================================
# COMMAND INJECTION (CWE-78)
# =========================================================================
@app.route("/ping")
def ping_host():
    host = request.args.get("host", "localhost")
    os.system(f"ping -c 4 {host}")
    return "ok"


@app.route("/run")
def run_cmd_subprocess():
    user_cmd = request.args.get("cmd", "ls")
    subprocess.run(user_cmd, shell=True, check=True)
    subprocess.Popen("grep " + user_cmd, shell=True)
    subprocess.check_output(f"cat {user_cmd}", shell=True)
    return "done"


@app.route("/eval")
def dangerous_eval_exec():
    data = request.args.get("code", "")
    eval(data)          # RCE directo
    exec(data)          # RCE directo
    return "ok"


@app.route("/deserialize", methods=["POST"])
def insecure_deserialization():
    raw = request.data
    pickle.loads(raw)   # CWE-502: RCE mediante deserialización
    return "ok"


# =========================================================================
# PATH TRAVERSAL (CWE-22)
# =========================================================================
@app.route("/download")
def download_file():
    filename = request.args.get("f", "")
    full_path = "./files/" + filename
    with open(full_path, "rb") as f:
        return f.read()


@app.route("/delete")
def remove_file():
    name = request.args.get("name", "")
    os.remove(name)
    return "deleted"


# =========================================================================
# XSS REFLEJADO (CWE-79)
# =========================================================================
@app.route("/greet")
def greet():
    name = request.args.get("name", "amigo")
    template = f"<h1>Bienvenido {name}</h1>"
    return render_template_string(template)


@app.route("/echo")
def echo():
    msg = request.args.get("msg", "")
    return Response(msg)


# =========================================================================
# CRIPTOGRAFÍA DÉBIL (CWE-327, CWE-338, CWE-916)
# =========================================================================
def hash_password_md5(password: str) -> str:
    return hashlib.md5(password.encode()).hexdigest()


def hash_password_sha1(password: str) -> str:
    return hashlib.sha1(password.encode()).hexdigest()


def password_stored_general():
    password = request.form.get("password", "")
    # Usar SHA-256 solo para contraseñas sigue siendo débil (falta salt + KDF)
    return hashlib.sha256(password.encode()).hexdigest()


def insecure_random_token():
    # random NO es criptográficamente seguro para tokens
    token = random.randint(0, 1000000)
    choice = random.choice(["a", "b", "c"])
    return str(token), choice


def small_rsa_key():
    rsa_key_size = 1024   # Mínimo recomendado hoy: 2048
    key_bits = 512
    return rsa_key_size, key_bits


# =========================================================================
# CÓDIGO SEGURO (para validar falsos positivos)
# =========================================================================
def secure_code_example():
    # Consulta parametrizada — NO debería detectarse como SQLi
    cursor = None
    user = "admin"
    cursor.execute("SELECT * FROM users WHERE name = ?", (user,))

    # subprocess sin shell=True — NO debería detectarse como Command Injection
    subprocess.run(["ping", "-c", "1", "localhost"])

    # secrets en lugar de random — correcto
    import secrets
    token = secrets.token_hex(16)
    return token


if __name__ == "__main__":
    app.run()
`;
