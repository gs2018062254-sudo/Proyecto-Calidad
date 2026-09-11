from __future__ import annotations

import ast
import os
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple, Any
from pathlib import Path


@dataclass
class ParsedFile:
    file_path: str
    source: str
    lines: List[str]
    tree: ast.AST
    imports: Dict[str, str] = field(default_factory=dict)
    from_imports: Dict[str, Tuple[str, Optional[str]]] = field(default_factory=dict)
    assignments: Dict[str, List[Tuple[int, ast.AST]]] = field(default_factory=dict)
    function_calls: List[Tuple[str, ast.Call, int]] = field(default_factory=list)
    function_defs: Dict[str, ast.FunctionDef] = field(default_factory=dict)
    class_defs: Dict[str, ast.ClassDef] = field(default_factory=dict)

    def get_line(self, line_number: int, context: int = 0) -> str:
        idx = line_number - 1
        if 0 <= idx < len(self.lines):
            if context == 0:
                return self.lines[idx].rstrip()
            start = max(0, idx - context)
            end = min(len(self.lines), idx + context + 1)
            return "\n".join(self.lines[i].rstrip() for i in range(start, end))
        return ""

    def resolve_name(self, name: str) -> Optional[str]:
        if name in self.imports:
            return self.imports[name]
        if name in self.from_imports:
            module, attr = self.from_imports[name]
            if attr:
                return f"{module}.{attr}"
            return module
        return None


class PythonParser:
    """Parser AST para archivos Python."""

    SOURCE_FUNCTIONS: Set[str] = {
        "input", "raw_input",
        "request", "request.args.get", "request.form.get",
        "request.json.get", "request.data", "request.GET.get",
        "request.POST.get", "request.REQUEST.get",
        "sys.stdin.read", "sys.stdin.readline",
        "open", "file.read", "file.readline", "file.readlines",
        "os.environ.get", "os.getenv",
        "json.loads", "json.load",
        "pickle.loads", "pickle.load",
        "yaml.load", "yaml.safe_load",
    }

    def __init__(self):
        pass

    def parse_file(self, file_path: str) -> Optional[ParsedFile]:
        try:
            path = Path(file_path)
            if not path.exists() or not path.is_file():
                return None
            source = path.read_text(encoding="utf-8", errors="replace")
            return self.parse_source(source, file_path)
        except Exception:
            return None

    def parse_source(self, source: str, file_path: str = "<string>") -> Optional[ParsedFile]:
        try:
            tree = ast.parse(source, filename=file_path)
        except SyntaxError:
            return None

        lines = source.splitlines()
        parsed = ParsedFile(
            file_path=file_path,
            source=source,
            lines=lines,
            tree=tree,
        )
        self._collect_metadata(tree, parsed)
        return parsed

    def _collect_metadata(self, tree: ast.AST, parsed: ParsedFile) -> None:
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    name = alias.asname if alias.asname else alias.name.split(".")[0]
                    parsed.imports[name] = alias.name

            elif isinstance(node, ast.ImportFrom):
                module = node.module or ""
                for alias in node.names:
                    name = alias.asname if alias.asname else alias.name
                    parsed.from_imports[name] = (module, alias.name)

            elif isinstance(node, ast.Assign):
                line = node.lineno
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        parsed.assignments.setdefault(target.id, []).append((line, node.value))
                    elif isinstance(target, (ast.Tuple, ast.List)):
                        for i, elt in enumerate(target.elts):
                            if isinstance(elt, ast.Name) and isinstance(node.value, (ast.Tuple, ast.List)):
                                if i < len(node.value.elts):
                                    parsed.assignments.setdefault(elt.id, []).append((line, node.value.elts[i]))

            elif isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name) and node.value:
                parsed.assignments.setdefault(node.target.id, []).append((node.lineno, node.value))

            elif isinstance(node, ast.AugAssign) and isinstance(node.target, ast.Name):
                parsed.assignments.setdefault(node.target.id, []).append((node.lineno, node))

            elif isinstance(node, ast.Call):
                func_name = self._get_call_name(node.func)
                parsed.function_calls.append((func_name, node, node.lineno))

            elif isinstance(node, ast.FunctionDef):
                parsed.function_defs[node.name] = node

            elif isinstance(node, ast.AsyncFunctionDef):
                parsed.function_defs[node.name] = node

            elif isinstance(node, ast.ClassDef):
                parsed.class_defs[node.name] = node

    def _get_call_name(self, func_node: ast.AST) -> str:
        """Obtiene el nombre completo de una llamada a función."""
        if isinstance(func_node, ast.Name):
            return func_node.id
        elif isinstance(func_node, ast.Attribute):
            parts = []
            current = func_node
            while isinstance(current, ast.Attribute):
                parts.append(current.attr)
                current = current.value
            if isinstance(current, ast.Name):
                parts.append(current.id)
            return ".".join(reversed(parts))
        elif isinstance(func_node, ast.Subscript):
            return self._get_call_name(func_node.value)
        elif isinstance(func_node, ast.Call):
            return self._get_call_name(func_node.func)
        return "<unknown>"

    def find_assignments_to(self, parsed: ParsedFile, target_names: Set[str], before_line: Optional[int] = None) -> List[Tuple[int, str, ast.AST]]:
        """Busca asignaciones a variables específicas, opcionalmente antes de una línea."""
        results = []
        for name in target_names:
            if name in parsed.assignments:
                for line, value in parsed.assignments[name]:
                    if before_line is None or line < before_line:
                        results.append((line, name, value))
        results.sort(key=lambda x: x[0])
        return results

    def extract_string_literals(self, node: ast.AST) -> List[str]:
        """Extrae todos los literales de cadena de un nodo AST."""
        strings = []
        for sub in ast.walk(node):
            if isinstance(sub, ast.Constant) and isinstance(sub.value, str):
                strings.append(sub.value)
            elif isinstance(sub, ast.JoinedStr):
                for v in sub.values:
                    if isinstance(v, ast.Constant) and isinstance(v.value, str):
                        strings.append(v.value)
        return strings

    def get_node_names(self, node: ast.AST) -> Set[str]:
        """Obtiene todos los nombres de variables usadas en un nodo."""
        names: Set[str] = set()
        for sub in ast.walk(node):
            if isinstance(sub, ast.Name):
                names.add(sub.id)
            elif isinstance(sub, ast.Attribute):
                if isinstance(sub.value, ast.Name):
                    names.add(f"{sub.value.id}.{sub.attr}")
        return names


def detect_language(file_path: str) -> Optional[str]:
    """Detecta el lenguaje de un archivo por extensión."""
    ext = Path(file_path).suffix.lower()
    mapping = {
        ".py": "python",
        ".pyw": "python",
    }
    return mapping.get(ext)
