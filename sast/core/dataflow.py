from __future__ import annotations

import ast
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple, Any
from collections import defaultdict

from .parser import ParsedFile, PythonParser


@dataclass
class TaintFlow:
    source_line: int
    source_var: str
    source_func: str
    sink_line: int
    sink_call: str
    sink_arg_idx: Optional[int] = None
    path: List[Tuple[int, str]] = field(default_factory=list)


class TaintAnalyzer:
    """Analizador de flujo de datos tainted (source → sink)."""

    TAINT_SOURCES: Dict[str, List[str]] = {
        "input": ["*"],
        "raw_input": ["*"],
        "sys.stdin.read": ["*"],
        "sys.stdin.readline": ["*"],
        "sys.stdin.readlines": ["*"],
        "os.environ.get": ["*"],
        "os.getenv": ["*"],
        "json.loads": [0],
        "json.load": [0],
        "pickle.loads": [0],
        "pickle.load": [0],
        "yaml.load": [0],
        "request": ["*"],
        "request.args.get": ["*"],
        "request.form.get": ["*"],
        "request.form": ["*"],
        "request.args": ["*"],
        "request.json": ["*"],
        "request.json.get": ["*"],
        "request.data": ["*"],
        "request.GET.get": ["*"],
        "request.POST.get": ["*"],
        "request.REQUEST.get": ["*"],
        "request.values.get": ["*"],
        "request.get_json": ["*"],
        "cgi.FieldStorage": ["*"],
        "flask.request.get_data": ["*"],
    }

    TAINT_PROPAGATORS: Dict[str, List[int]] = {
        "str": [0],
        "repr": [0],
        "format": ["*"],
        "encode": [0],
        "decode": [0],
        "lower": [0],
        "upper": [0],
        "strip": [0],
        "lstrip": [0],
        "rstrip": [0],
        "replace": [0],
        "split": [0],
        "join": [0],
        "strip": [0],
        "__add__": ["*"],
        "__iadd__": ["*"],
        "fstring": ["*"],
        "bytes": [0],
        "bytearray": [0],
        "%": ["*"],
    }

    SQL_SINKS: Dict[str, List[int]] = {
        "execute": [0],
        "executemany": [0],
        "executescript": [0],
        "cursor.execute": [0],
        "cursor.executemany": [0],
        "db.execute": [0],
        "session.execute": [0],
        "connection.execute": [0],
        "raw": [0],
        "query": [0],
    }

    COMMAND_SINKS: Dict[str, List[int]] = {
        "eval": ["*"],
        "exec": ["*"],
        "os.system": [0],
        "os.popen": [0],
        "os.popen2": [0],
        "os.popen3": [0],
        "os.popen4": [0],
        "subprocess.call": [0],
        "subprocess.Popen": [0],
        "subprocess.run": [0],
        "subprocess.check_call": [0],
        "subprocess.check_output": [0],
        "subprocess.getoutput": [0],
        "subprocess.getstatusoutput": [0],
        "commands.getoutput": [0],
        "commands.getstatusoutput": [0],
        "popen2.popen2": [0],
        "popen2.popen3": [0],
        "popen2.popen4": [0],
    }

    PATH_SINKS: Dict[str, List[int]] = {
        "open": [0],
        "io.open": [0],
        "file": [0],
        "os.open": [0],
        "os.remove": [0],
        "os.unlink": [0],
        "os.rmdir": [0],
        "os.rename": [0, 1],
        "os.replace": [0, 1],
        "os.mkdir": [0],
        "os.makedirs": [0],
        "shutil.copy": [0, 1],
        "shutil.copy2": [0, 1],
        "shutil.move": [0, 1],
        "shutil.rmtree": [0],
        "send_file": [0],
        "send_from_directory": [1],
        "static_file": [0],
    }

    XSS_SINKS: Dict[str, List[int]] = {
        "render_template_string": [0],
        "flask.render_template_string": [0],
        "markupsafe.Markup": [0],
        "jinja2.Template": [0],
        "Response": [0],
        "flask.Response": [0],
        "make_response": [0],
    }

    def __init__(self):
        self.parser = PythonParser()

    def analyze_file(self, parsed: ParsedFile) -> Dict[str, List[TaintFlow]]:
        """Analiza un archivo buscando flujos tainted hacia diferentes sinks."""
        if parsed.tree is None:
            return defaultdict(list)
        taint_map = self._build_taint_map(parsed)
        results: Dict[str, List[TaintFlow]] = defaultdict(list)

        for func_name, call_node, line in parsed.function_calls:
            matched_sink, arg_indices = self._match_sink(func_name, self.SQL_SINKS)
            if matched_sink:
                flows = self._check_sink_taint(parsed, call_node, line, func_name, arg_indices, taint_map)
                results["sql"].extend(flows)

            matched_sink, arg_indices = self._match_sink(func_name, self.COMMAND_SINKS)
            if matched_sink:
                flows = self._check_sink_taint(parsed, call_node, line, func_name, arg_indices, taint_map)
                results["command"].extend(flows)

            matched_sink, arg_indices = self._match_sink(func_name, self.PATH_SINKS)
            if matched_sink:
                flows = self._check_sink_taint(parsed, call_node, line, func_name, arg_indices, taint_map)
                results["path"].extend(flows)

            matched_sink, arg_indices = self._match_sink(func_name, self.XSS_SINKS)
            if matched_sink:
                flows = self._check_sink_taint(parsed, call_node, line, func_name, arg_indices, taint_map)
                results["xss"].extend(flows)

        return results

    def _build_taint_map(self, parsed: ParsedFile) -> Dict[str, List[Tuple[int, str, List[Tuple[int, str]]]]]:
        """Construye un mapa de variables tainted: nombre_var → [(linea, source_func, path)]."""
        taint_map: Dict[str, List[Tuple[int, str, List[Tuple[int, str]]]]] = defaultdict(list)

        # 1. Mapear nodos de llamada que coinciden con fuentes de entrada
        source_calls: Dict[int, str] = {}
        for func_name, call_node, _ in parsed.function_calls:
            matched = self._match_source(func_name)
            if matched:
                source_calls[id(call_node)] = matched

        # 2. Identificar asignaciones iniciales que reciben datos de esas fuentes
        for var_name, assign_list in parsed.assignments.items():
            for line, value_node in assign_list:
                matched_source = None
                if id(value_node) in source_calls:
                    matched_source = source_calls[id(value_node)]
                else:
                    for child in ast.walk(value_node):
                        if id(child) in source_calls:
                            matched_source = source_calls[id(child)]
                            break
                if matched_source:
                    taint_map[var_name].append((line, matched_source, [(line, var_name)]))

        # 3. Propagación iterativa eficiente sobre las asignaciones del archivo
        changed = True
        iterations = 0
        while changed and iterations < 5:
            changed = False
            iterations += 1
            for var_name, assignments in parsed.assignments.items():
                for line, value in assignments:
                    tainted_names, source_func, path = self._node_is_tainted(value, taint_map)
                    if tainted_names:
                        already = any(
                            existing_line <= line
                            for existing_line, _, _ in taint_map.get(var_name, [])
                        )
                        if not already:
                            new_path = path + [(line, var_name)]
                            taint_map[var_name].append((line, source_func, new_path))
                            changed = True

        return taint_map

    def _match_source(self, func_name: str) -> Optional[str]:
        """Busca si una llamada a función coincide con un source."""
        if func_name in self.TAINT_SOURCES:
            return func_name
        for src in self.TAINT_SOURCES:
            if func_name.endswith("." + src) or src.endswith("." + func_name):
                return src
        return None

    def _match_sink(self, func_name: str, sink_dict: Dict[str, List[int]]) -> Tuple[Optional[str], List[int]]:
        """Busca si una llamada coincide con un sink y devuelve los índices de argumentos a chequear."""
        if func_name in sink_dict:
            return func_name, sink_dict[func_name]
        for sink_name, arg_indices in sink_dict.items():
            if func_name.endswith("." + sink_name) or sink_name.endswith("." + func_name):
                return sink_name, arg_indices
        return None, []

    def _node_is_tainted(
        self, node: ast.AST, taint_map: Dict[str, List[Tuple[int, str, List[Tuple[int, str]]]]]
    ) -> Tuple[bool, str, List[Tuple[int, str]]]:
        """Determina si un nodo AST contiene datos tainted."""
        if isinstance(node, ast.Name):
            if node.id in taint_map and taint_map[node.id]:
                _, source_func, path = taint_map[node.id][-1]
                return True, source_func, path

        if isinstance(node, ast.BinOp) and isinstance(node.op, (ast.Add, ast.Mod)):
            left_tainted, left_src, left_path = self._node_is_tainted(node.left, taint_map)
            if left_tainted:
                return True, left_src, left_path
            right_tainted, right_src, right_path = self._node_is_tainted(node.right, taint_map)
            if right_tainted:
                return True, right_src, right_path

        if isinstance(node, ast.JoinedStr):
            for value in node.values:
                if not isinstance(value, ast.Constant):
                    t, s, p = self._node_is_tainted(value, taint_map)
                    if t:
                        return True, s, p

        if isinstance(node, ast.Call):
            func_name = self.parser._get_call_name(node.func)
            if func_name in self.TAINT_PROPAGATORS or "format" in func_name or "join" in func_name:
                prop_indices = self.TAINT_PROPAGATORS.get(func_name, ["*"])
                for i, arg in enumerate(node.args):
                    if "*" in prop_indices or i in prop_indices:
                        t, s, p = self._node_is_tainted(arg, taint_map)
                        if t:
                            return True, s, p
                for kw in node.keywords:
                    if "*" in prop_indices or kw.arg in (str(p) for p in prop_indices if isinstance(p, str)):
                        t, s, p = self._node_is_tainted(kw.value, taint_map)
                        if t:
                            return True, s, p
                if isinstance(node.func, ast.Attribute):
                    t, s, p = self._node_is_tainted(node.func.value, taint_map)
                    if t:
                        return True, s, p

        if isinstance(node, ast.FormattedValue):
            return self._node_is_tainted(node.value, taint_map)

        if isinstance(node, (ast.Tuple, ast.List, ast.Set)):
            for elt in node.elts:
                t, s, p = self._node_is_tainted(elt, taint_map)
                if t:
                    return True, s, p

        if isinstance(node, ast.Dict):
            for v in node.values:
                if v is not None:
                    t, s, p = self._node_is_tainted(v, taint_map)
                    if t:
                        return True, s, p

        if isinstance(node, ast.Subscript):
            return self._node_is_tainted(node.value, taint_map)

        if isinstance(node, ast.Attribute):
            return self._node_is_tainted(node.value, taint_map)

        if isinstance(node, (ast.AugAssign,)):
            return self._node_is_tainted(node.value, taint_map)

        return False, "", []

    def _check_sink_taint(
        self,
        parsed: ParsedFile,
        call_node: ast.Call,
        sink_line: int,
        sink_call: str,
        arg_indices: List[int],
        taint_map: Dict[str, List[Tuple[int, str, List[Tuple[int, str]]]]],
    ) -> List[TaintFlow]:
        """Verifica si los argumentos de un sink están tainted."""
        flows: List[TaintFlow] = []

        args_to_check = list(enumerate(call_node.args))
        if "*" in arg_indices:
            pass
        else:
            args_to_check = [(i, arg) for i, arg in args_to_check if i in arg_indices]

        for kw in call_node.keywords:
            args_to_check.append((-1, kw.value))

        for arg_idx, arg in args_to_check:
            is_tainted, source_func, path = self._node_is_tainted(arg, taint_map)
            if is_tainted and path:
                source_line = path[0][0] if path else sink_line
                source_var = path[0][1] if path else "unknown"
                flows.append(TaintFlow(
                    source_line=source_line,
                    source_var=source_var,
                    source_func=source_func,
                    sink_line=sink_line,
                    sink_call=sink_call,
                    sink_arg_idx=arg_idx if arg_idx >= 0 else None,
                    path=path,
                ))

        return flows
