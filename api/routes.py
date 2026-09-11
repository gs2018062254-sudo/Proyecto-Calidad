# -*- coding: utf-8 -*-
"""Definición de rutas y enrutamiento con Blueprint."""

from flask import Blueprint

from .controllers.health_controller import HealthController
from .controllers.rules_controller import RulesController
from .controllers.scan_controller import ScanController
from .controllers.github_controller import GitHubController

api_bp = Blueprint("api", __name__)


@api_bp.route("/api/health", methods=["GET"])
@api_bp.route("/health", methods=["GET"])
def health():
    return HealthController.check_health()


@api_bp.route("/api/rules", methods=["GET"])
@api_bp.route("/rules", methods=["GET"])
def rules():
    return RulesController.list_rules()


@api_bp.route("/api/scan", methods=["POST"])
@api_bp.route("/scan", methods=["POST"])
def scan():
    return ScanController.scan()


# Endpoints de integración con GitHub
@api_bp.route("/api/github/user", methods=["GET"])
def github_user():
    return GitHubController.get_user()


@api_bp.route("/api/github/repos", methods=["GET"])
def github_repos():
    return GitHubController.list_repos()


@api_bp.route("/api/github/scan", methods=["POST"])
def github_scan():
    return GitHubController.scan_repo()
