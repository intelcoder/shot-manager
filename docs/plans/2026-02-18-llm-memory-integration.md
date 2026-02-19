# LLM Memory Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Modify `llm-memory` to store sessions in per-project isolated ChromaDB databases, then wire it into Claude Code with a global SessionEnd hook and a per-project MCP server for shot-manager.

**Architecture:** Add a `projects_dir` layer to `GlobalConfig` so each project gets `~/.llm-memory/projects/{name}/chroma/`. `SessionManager` reads the `LLM_MEMORY_PROJECT` env var to scope queries; the SessionEnd hook always saves to the project derived from `cwd`. Claude Code global settings get the hook; shot-manager gets a project-local MCP entry.

**Tech Stack:** Python 3.10+, ChromaDB, sentence-transformers (local), pytest, Claude Code settings JSON

---

### Task 1: Add per-project chroma dir to `GlobalConfig`

**Files:**
- Modify: `C:/Users/seong/projects/llm-memory/src/llm_memory/models/config.py`
- Modify: `C:/Users/seong/projects/llm-memory/tests/test_models.py`

**Step 1: Write failing tests**

Add to `tests/test_models.py` inside `TestGlobalConfig`:

```python
def test_projects_dir(self):
    """Test projects directory path."""
    config = GlobalConfig()
    assert config.projects_dir == config.data_dir / "projects"

def test_get_project_chroma_dir(self):
    """Test per-project chroma directory path."""
    config = GlobalConfig()
    result = config.get_project_chroma_dir("shot-manager")
    assert result == config.data_dir / "projects" / "shot-manager" / "chroma"

def test_ensure_project_dirs_creates_chroma_path(self, tmp_path):
    """Test that ensure_project_dirs creates the right directory structure."""
    config = GlobalConfig(data_dir=tmp_path)
    config.ensure_project_dirs("my-project")
    assert (tmp_path / "projects" / "my-project" / "chroma").exists()
```

**Step 2: Run tests to verify they fail**

```bash
cd C:/Users/seong/projects/llm-memory
python -m pytest tests/test_models.py::TestGlobalConfig::test_projects_dir tests/test_models.py::TestGlobalConfig::test_get_project_chroma_dir tests/test_models.py::TestGlobalConfig::test_ensure_project_dirs_creates_chroma_path -v
```

Expected: `FAILED` — `AttributeError: 'GlobalConfig' object has no attribute 'projects_dir'`

**Step 3: Implement in `config.py`**

Add after the existing `chroma_dir` property and `cache_dir` property:

```python
@property
def projects_dir(self) -> Path:
    """Get the per-project storage directory."""
    return self.data_dir / "projects"

def get_project_chroma_dir(self, project_name: str) -> Path:
    """Get the ChromaDB directory for a specific project."""
    return self.projects_dir / project_name / "chroma"

def ensure_project_dirs(self, project_name: str) -> None:
    """Ensure all required directories exist for a project."""
    self.get_project_chroma_dir(project_name).mkdir(parents=True, exist_ok=True)
```

**Step 4: Run tests to verify they pass**

```bash
python -m pytest tests/test_models.py::TestGlobalConfig -v
```

Expected: All `TestGlobalConfig` tests `PASSED`

**Step 5: Commit**

```bash
cd C:/Users/seong/projects/llm-memory
git add src/llm_memory/models/config.py tests/test_models.py
git commit -m "feat: add per-project chroma dir support to GlobalConfig"
```

---

### Task 2: Update `ChromaStore` to route to per-project path

**Files:**
- Modify: `C:/Users/seong/projects/llm-memory/src/llm_memory/storage/chroma_store.py`
- Create: `C:/Users/seong/projects/llm-memory/tests/test_storage.py`

**Step 1: Write failing test**

Create `tests/test_storage.py`:

```python
"""Tests for ChromaStore per-project routing."""

import pytest
from unittest.mock import patch, MagicMock
from pathlib import Path

from llm_memory.models.config import GlobalConfig
from llm_memory.storage.chroma_store import ChromaStore


class TestChromaStorePerProject:
    """Tests for per-project ChromaDB routing."""

    def test_uses_shared_chroma_when_no_project(self, tmp_path):
        """Without project_name, uses shared chroma_dir (backward compat)."""
        config = GlobalConfig(data_dir=tmp_path)
        store = ChromaStore(config=config)
        assert store.db_path == config.chroma_dir

    def test_uses_project_chroma_when_project_given(self, tmp_path):
        """With project_name, uses project-specific chroma dir."""
        config = GlobalConfig(data_dir=tmp_path)
        store = ChromaStore(config=config, project_name="shot-manager")
        assert store.db_path == config.get_project_chroma_dir("shot-manager")

    def test_project_chroma_dir_is_created(self, tmp_path):
        """ChromaStore creates the project chroma dir if missing."""
        config = GlobalConfig(data_dir=tmp_path)
        ChromaStore(config=config, project_name="my-project")
        assert (tmp_path / "projects" / "my-project" / "chroma").exists()
```

**Step 2: Run to verify failure**

```bash
python -m pytest tests/test_storage.py -v
```

Expected: `FAILED` — `TypeError: ChromaStore.__init__() got an unexpected keyword argument 'project_name'`

**Step 3: Implement in `chroma_store.py`**

Change `__init__` signature and add `db_path` attribute:

```python
def __init__(self, config: GlobalConfig | None = None, project_name: str | None = None):
    """Initialize the ChromaDB store."""
    self.config = config or GlobalConfig.load()
    self.project_name = project_name

    if project_name:
        self.db_path = self.config.get_project_chroma_dir(project_name)
        self.config.ensure_project_dirs(project_name)
    else:
        self.db_path = self.config.chroma_dir
        self.config.ensure_dirs()

    self._client = chromadb.PersistentClient(
        path=str(self.db_path),
        settings=Settings(
            anonymized_telemetry=False,
            allow_reset=True,
        ),
    )
    self._collection = self._client.get_or_create_collection(
        name=self.COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )
```

**Step 4: Run tests**

```bash
python -m pytest tests/test_storage.py -v
```

Expected: All 3 tests `PASSED`

**Step 5: Run full test suite to check no regressions**

```bash
python -m pytest tests/ -v
```

Expected: All existing tests still `PASSED`

**Step 6: Commit**

```bash
git add src/llm_memory/storage/chroma_store.py tests/test_storage.py
git commit -m "feat: route ChromaStore to per-project chroma dir"
```

---

### Task 3: Update `SessionManager` to use env var and per-project stores

**Files:**
- Modify: `C:/Users/seong/projects/llm-memory/src/llm_memory/core/session.py`
- Create: `C:/Users/seong/projects/llm-memory/tests/test_session_manager.py`

**Step 1: Write failing tests**

Create `tests/test_session_manager.py`:

```python
"""Tests for SessionManager per-project behavior."""

import os
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

from llm_memory.models.config import GlobalConfig


class TestSessionManagerProjectScoping:
    """Tests for per-project session storage and env var scoping."""

    def test_save_uses_project_from_path(self, tmp_path, monkeypatch):
        """create_session stores to the project derived from project_path."""
        monkeypatch.delenv("LLM_MEMORY_PROJECT", raising=False)

        # Mock embedder to avoid model download
        with patch("llm_memory.core.session.get_embedder") as mock_emb:
            mock_emb.return_value.embed.return_value = [0.1] * 384
            config = GlobalConfig(data_dir=tmp_path)

            with patch("llm_memory.core.session.GlobalConfig.load", return_value=config):
                from llm_memory.core.session import SessionManager
                mgr = SessionManager()
                session = mgr.create_session(
                    summary="Test session",
                    project_path=str(tmp_path / "my-project"),
                )

        assert session.project_name == "my-project"
        # DB should exist for my-project
        assert (tmp_path / "projects" / "my-project" / "chroma").exists()

    def test_query_scoped_to_env_var_project(self, tmp_path, monkeypatch):
        """query_sessions uses LLM_MEMORY_PROJECT env var when no project param."""
        monkeypatch.setenv("LLM_MEMORY_PROJECT", "shot-manager")

        with patch("llm_memory.core.session.get_embedder") as mock_emb:
            mock_emb.return_value.embed.return_value = [0.1] * 384
            config = GlobalConfig(data_dir=tmp_path)

            with patch("llm_memory.core.session.GlobalConfig.load", return_value=config):
                from llm_memory.core.session import SessionManager
                mgr = SessionManager()
                # Should not raise even if DB is empty
                results = mgr.query_sessions("test query")

        assert results == []

    def test_env_var_project_stored_on_manager(self, tmp_path, monkeypatch):
        """SessionManager reads LLM_MEMORY_PROJECT into self.default_project."""
        monkeypatch.setenv("LLM_MEMORY_PROJECT", "breadcrumbs")

        with patch("llm_memory.core.session.get_embedder"):
            with patch("llm_memory.core.session.GlobalConfig.load",
                       return_value=GlobalConfig(data_dir=tmp_path)):
                from llm_memory.core.session import SessionManager
                mgr = SessionManager()

        assert mgr.default_project == "breadcrumbs"
```

**Step 2: Run to verify failure**

```bash
python -m pytest tests/test_session_manager.py -v
```

Expected: `FAILED` — `AttributeError: 'SessionManager' object has no attribute 'default_project'`

**Step 3: Implement in `session.py`**

Update `SessionManager.__init__` and `create_session`:

```python
import os

class SessionManager:
    """Manages work session creation, storage, and retrieval."""

    def __init__(self):
        """Initialize the session manager."""
        self.default_project: str | None = os.environ.get("LLM_MEMORY_PROJECT")
        self.config = GlobalConfig.load()
        self.embedder = get_embedder()

    def _get_store(self, project_name: str | None = None) -> ChromaStore:
        """Get the ChromaStore for the given project (or default)."""
        effective_project = project_name or self.default_project
        return ChromaStore(config=self.config, project_name=effective_project)

    def create_session(
        self,
        summary: str,
        project_path: str | Path | None = None,
        ...  # keep all existing params
    ) -> WorkSession:
        """Create and store a new work session."""
        project_path_resolved, project_name_from_path = get_project_info(project_path)
        project_config = ProjectConfig.load_or_default(project_path_resolved)
        resolved_project_name = project_config.get_project_name(project_path_resolved)

        all_tags = list(project_config.default_tags)
        if tags:
            all_tags.extend(t for t in tags if t not in all_tags)

        now = datetime.now()
        session = WorkSession(
            started_at=started_at or now,
            ended_at=ended_at or now,
            project_path=str(project_path_resolved),
            project_name=resolved_project_name,
            summary=summary,
            decisions=decisions or [],
            files_changed=files_changed or [],
            tags=all_tags,
            topics=topics or [],
            source=source,
            raw_log_path=raw_log_path,
        )

        # Always save to the project derived from path (not env var)
        store = self._get_store(project_name=resolved_project_name)
        embedding = self.embedder.embed(session.to_embedding_text())
        store.add_session(session, embedding)

        return session

    def query_sessions(
        self,
        query: str,
        n_results: int = 10,
        project: str | None = None,
        tags: list[str] | None = None,
    ) -> list[tuple[WorkSession, float]]:
        """Query sessions using semantic search."""
        query_embedding = self.embedder.embed(query)
        effective_project = project if project is not None else self.default_project

        if effective_project:
            # Scoped query: single project DB
            store = self._get_store(project_name=effective_project)
            return store.query(query_embedding, n_results=n_results, tags=tags)
        else:
            # Cross-project: search all project DBs and aggregate
            return self._query_all_projects(query_embedding, n_results=n_results, tags=tags)

    def _query_all_projects(
        self,
        query_embedding: list[float],
        n_results: int = 10,
        tags: list[str] | None = None,
    ) -> list[tuple[WorkSession, float]]:
        """Search across all project DBs and return top results."""
        projects_dir = self.config.projects_dir
        if not projects_dir.exists():
            return []

        all_results: list[tuple[WorkSession, float]] = []
        for project_dir in projects_dir.iterdir():
            if not project_dir.is_dir():
                continue
            chroma_path = project_dir / "chroma"
            if not chroma_path.exists():
                continue
            store = ChromaStore(config=self.config, project_name=project_dir.name)
            results = store.query(query_embedding, n_results=n_results, tags=tags)
            all_results.extend(results)

        # Sort by similarity descending and return top n_results
        all_results.sort(key=lambda x: x[1], reverse=True)
        return all_results[:n_results]

    def list_sessions(
        self,
        limit: int = 20,
        project: str | None = None,
    ) -> list[WorkSession]:
        """List recent sessions."""
        effective_project = project if project is not None else self.default_project
        store = self._get_store(project_name=effective_project)
        return store.list_sessions(limit=limit)
```

Note: The `store` attribute is removed — replaced by `_get_store()`. Update `get_session`, `delete_session`, and `get_stats` similarly to call `_get_store()`.

**Step 4: Run tests**

```bash
python -m pytest tests/test_session_manager.py -v
```

Expected: All 3 tests `PASSED`

**Step 5: Run full test suite**

```bash
python -m pytest tests/ -v
```

Expected: All tests `PASSED` (existing tests may need `monkeypatch.delenv("LLM_MEMORY_PROJECT", raising=False)` if they instantiate SessionManager)

**Step 6: Commit**

```bash
git add src/llm_memory/core/session.py tests/test_session_manager.py
git commit -m "feat: scope SessionManager to per-project DBs via LLM_MEMORY_PROJECT env var"
```

---

### Task 4: Install the package

**Step 1: Install with optional llm extras (for Claude summarization)**

```bash
pip install -e "C:/Users/seong/projects/llm-memory[llm]"
```

If you don't have an `ANTHROPIC_API_KEY` yet or want fully offline:

```bash
pip install -e "C:/Users/seong/projects/llm-memory"
```

**Step 2: Verify the CLI is available**

```bash
llm-memory --help
```

Expected: Shows the help text with commands: `save`, `query`, `list`, `show`, `stats`, `hook`, `mcp`, `export`, `mcp-serve`

**Step 3: Verify stats shows empty state**

```bash
llm-memory stats
```

Expected: `Total Sessions: 0`

---

### Task 5: Add global SessionEnd hook to Claude Code

**Files:**
- Modify: `C:/Users/seong/.claude/settings.json`

**Step 1: Read current settings**

Open `C:/Users/seong/.claude/settings.json` and note existing content. It currently has `model`, `statusLine`, `enabledPlugins`, `skipDangerousModePermissionPrompt`.

**Step 2: Add the hook**

Add a `"hooks"` key at the top level. The final file should look like:

```json
{
  "model": "Opusplan",
  "statusLine": { ... },
  "enabledPlugins": { ... },
  "skipDangerousModePermissionPrompt": true,
  "hooks": {
    "SessionEnd": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "llm-memory save --from-claude --auto"
          }
        ]
      }
    ]
  }
}
```

Keep all existing keys exactly as they are — only add the `"hooks"` key.

**Step 3: Verify JSON is valid**

```bash
python -c "import json; json.load(open('C:/Users/seong/.claude/settings.json')); print('valid')"
```

Expected: `valid`

**Step 4: Commit** (in the shot-manager repo to document this change)

```bash
cd C:/Users/seong/projects/shot-manager
git add docs/
git commit -m "docs: document llm-memory global hook installation"
```

---

### Task 6: Add project-scoped MCP server for shot-manager

**Files:**
- Create: `C:/Users/seong/projects/shot-manager/.claude/settings.json`

**Step 1: Create the `.claude` directory**

```bash
mkdir -p "C:/Users/seong/projects/shot-manager/.claude"
```

**Step 2: Create `settings.json`**

```json
{
  "mcpServers": {
    "llm-memory": {
      "command": "llm-memory",
      "args": ["mcp-serve"],
      "env": {
        "LLM_MEMORY_PROJECT": "shot-manager"
      }
    }
  }
}
```

**Step 3: Verify the MCP server starts**

```bash
echo '{"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"0.1"}}}' | llm-memory mcp-serve
```

Expected: JSON response with `"result"` containing server info (then hangs waiting for more input — `Ctrl+C` to exit)

**Step 4: Commit**

```bash
cd C:/Users/seong/projects/shot-manager
git add .claude/settings.json
git commit -m "feat: add llm-memory MCP server scoped to shot-manager project"
```

---

### Task 7: Smoke test end-to-end

**Step 1: Manually save a test session**

```bash
llm-memory save \
  --summary "Testing llm-memory integration with shot-manager" \
  --tag integration \
  --tag test \
  --project "C:/Users/seong/projects/shot-manager"
```

Expected: `Session saved! ID: xxxxxxxx`

**Step 2: Verify it landed in the right DB**

```bash
llm-memory stats
```

Expected: Shows `shot-manager: 1`

**Step 3: Query it back**

```bash
llm-memory query "testing integration" --project shot-manager
```

Expected: Shows the session you just saved with a high relevance score

**Step 4: Verify isolation — no cross-bleed**

```bash
llm-memory query "testing integration" --project breadcrumbs
```

Expected: `No matching sessions found` (breadcrumbs has its own empty DB)

**Step 5: Verify cross-project search**

```bash
llm-memory query "testing integration"
```

Expected: Shows the shot-manager session (scans all project DBs)

---

### Task 8: Add `.llm-memory.json` project config for shot-manager (optional)

This lets you set a canonical project name and default tags.

**Files:**
- Create: `C:/Users/seong/projects/shot-manager/.llm-memory.json`

**Step 1: Create the config**

```json
{
  "project_name": "shot-manager",
  "default_tags": ["electron", "typescript"],
  "auto_capture": true
}
```

**Step 2: Verify it's picked up**

```bash
cd C:/Users/seong/projects/shot-manager
llm-memory save --summary "Configured project memory" --from-claude --auto || \
llm-memory save --summary "Project config test"
llm-memory list --project shot-manager
```

Expected: New session shows `electron`, `typescript` tags automatically

**Step 3: Commit**

```bash
cd C:/Users/seong/projects/shot-manager
git add .llm-memory.json
git commit -m "feat: add llm-memory project config with default tags"
```
