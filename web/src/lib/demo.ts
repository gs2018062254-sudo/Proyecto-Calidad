export const DEMO_SOURCE = `# -*- coding: utf-8 -*-
"""Ejemplo de código vulnerable para probar SAST Studio."""

import sqlite3
import os
import subprocess
import pickle
import hashlib
import random
from flask import Flask, request, render_template_string

app = Flask(__name__)

# Secreto hardcodeado (CWE-798)
API_KEY = "sk-abcdefghijklmnopqrstuvwxyz1234567890"


@app.route("/login", methods=["POST"])
def login():
    username = request.form.get("username")
    password = request.form.get("password")

    # SQL Injection: input del usuario directamente concatenado (CWE-89)
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()
    query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
    cursor.execute(query)
    user = cursor.fetchone()
    return str(user)


@app.route("/read_file")
def read_file():
    # Path Traversal (CWE-22)
    filename = request.args.get("file", "")
    path = "./uploads/" + filename
    with open(path, "r") as f:
        return f.read()


@app.route("/ping")
def ping():
    host = request.args.get("host", "localhost")
    # Command Injection (CWE-78)
    result = os.system(f"ping -c 1 {host}")
    return str(result)


@app.route("/exec")
def execute_code():
    code = request.args.get("code")
    eval(code)
    subprocess.run(code, shell=True)
    return "ok"


@app.route("/greet")
def greet():
    name = request.args.get("name", "mundo")
    # XSS reflejado (CWE-79)
    template = f"<h1>Hola {name}!</h1>"
    return render_template_string(template)


@app.route("/upload", methods=["POST"])
def upload():
    data = request.data
    # Deserialización insegura (CWE-502)
    obj = pickle.loads(data)
    return str(obj)


def hash_password(password: str) -> str:
    # Hash débil MD5 para contraseña (CWE-327 / CWE-916)
    return hashlib.md5(password.encode()).hexdigest()


def random_token() -> str:
    # PRNG no criptográfico (CWE-338)
    return str(random.randint(100000, 999999))
`;
