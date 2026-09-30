# -*- coding: utf-8 -*-
"""Definición de rutas y enrutamiento con Blueprint.

Rutas públicas: /api/health, /api/auth/*
Rutas protegidas: todo lo demás (JWT Bearer por @requires_auth)
"""

from flask import Blueprint

from .controllers.health_controller import HealthController
from .controllers.rules_controller import RulesController
from .controllers.scan_controller import ScanController
from .controllers.github_controller import GitHubController
from .controllers.auth_controller import AuthController
from .middleware import requires_auth

api_bp = Blueprint("api", __name__)


# ==========================================================================
# ENDPOINTS PÚBLICOS (no requieren JWT)
# ==========================================================================

@api_bp.route("/api/health", methods=["GET"])
@api_bp.route("/health", methods=["GET"])
def health():
    return HealthController.check_health()


# -------- Autenticación --------
@api_bp.route("/api/auth/login", methods=["GET"])
@api_bp.route("/auth/login", methods=["GET"])
def auth_login():
    return AuthController.github_login()


@api_bp.route("/api/auth/callback", methods=["GET"])
@api_bp.route("/auth/callback", methods=["GET"])
def auth_callback():
    return AuthController.github_callback()


@api_bp.route("/api/auth/demo-login", methods=["POST"])
@api_bp.route("/auth/demo-login", methods=["POST"])
def auth_demo_login():
    return AuthController.demo_login()


@api_bp.route("/api/auth/logout", methods=["POST", "GET"])
@api_bp.route("/auth/logout", methods=["POST", "GET"])
def auth_logout():
    return AuthController.logout()


# ==========================================================================
# ENDPOINTS PROTEGIDOS (requieren JWT Bearer en Authorization header)
# ==========================================================================

@api_bp.route("/api/auth/me", methods=["GET"])
@api_bp.route("/auth/me", methods=["GET"])
@requires_auth
def auth_me():
    return AuthController.me()


@api_bp.route("/api/rules", methods=["GET"])
@api_bp.route("/rules", methods=["GET"])
@requires_auth
def rules():
    return RulesController.list_rules()


@api_bp.route("/api/scan", methods=["POST"])
@api_bp.route("/scan", methods=["POST"])
@requires_auth
def scan():
    return ScanController.scan()


# Endpoints de integración con GitHub
@api_bp.route("/api/github/user", methods=["GET"])
@api_bp.route("/github/user", methods=["GET"])
@requires_auth
def github_user():
    return GitHubController.get_user()


@api_bp.route("/api/github/repos", methods=["GET"])
@api_bp.route("/github/repos", methods=["GET"])
@requires_auth
def github_repos():
    return GitHubController.list_repos()


@api_bp.route("/api/github/scan", methods=["POST"])
@api_bp.route("/github/scan", methods=["POST"])
@requires_auth
def github_scan():
    return GitHubController.scan_repo()
