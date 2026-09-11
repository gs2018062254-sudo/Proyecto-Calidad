# -*- coding: utf-8 -*-
"""Ejemplo mínimo de SQL Injection para pruebas rápidas."""

import sqlite3

username = input("Usuario: ")
query = "SELECT * FROM users WHERE username = '" + username + "'"

conn = sqlite3.connect("test.db")
cursor = conn.cursor()
cursor.execute(query)
print(cursor.fetchall())
