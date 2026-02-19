# LLM Memory Integration Design

**Date:** 2026-02-18
**Status:** Approved

## Overview

Integrate the existing `llm-memory` Python tool with Claude Code to provide global, per-project isolated memory. Sessions from every Claude Code project are automatically captured at session end and stored in separate ChromaDB databases per project. The MCP server exposes semantic search tools scoped to the current project by default.

## Goals

- Auto-capture every Claude Code session end across all projects
- Each project gets its own isolated ChromaDB (no cross-project data bleed)
- In-conversation semantic search via MCP tools, defaulting to the current project
- Cross-project search available when needed
- Fully local: no API key required for embeddings (`sentence-transformers` + `all-MiniLM-L6-v2`)
- Optional Claude summarization via `ANTHROPIC_API_KEY`

## Storage Layout

```
~/.llm-memory/
├── config.json
└── projects/
    ├── shot-manager/
    │   └── chroma/         ← isolated ChromaDB for shot-manager
    ├── breadcrumbs/
    │   └── chroma/
    └── voice-flow/
        └── chroma/
```

Each project's data is completely isolated. Cross-project queries iterate all project DBs and aggregate results.

## Architecture

### Capture Flow (global)

```
Claude Code session ends
  └─ SessionEnd hook (global, ~/.claude/settings.json)
       └─ llm-memory save --from-claude --auto
            ├─ reads cwd from hook stdin
            ├─ finds latest .jsonl log for that project
            ├─ extracts session data (summary, decisions, files, tags)
            └─ stores to ~/.llm-memory/projects/{project-name}/chroma/
```

### Search Flow (project-scoped)

```
In conversation (shot-manager project)
  └─ MCP Server (env: LLM_MEMORY_PROJECT=shot-manager)
       └─ memory_search("IPC patterns")
            └─ queries ~/.llm-memory/projects/shot-manager/chroma/
```

When `project` param is explicitly passed as `null` or `"*"`, the MCP iterates all project DBs and aggregates results ranked by relevance.

## Code Changes — `llm-memory` project

### 1. `GlobalConfig` (`models/config.py`)

Add:
- `projects_dir` property → `data_dir / "projects"`
- `get_project_chroma_dir(project_name: str) -> Path` method → `projects_dir / project_name / "chroma"`
- `ensure_project_dirs(project_name: str)` method

Keep existing `chroma_dir` for backward compatibility (used as fallback).

### 2. `ChromaStore` (`storage/chroma_store.py`)

- Add `project_name: str | None = None` parameter to `__init__`
- When `project_name` is set, use `config.get_project_chroma_dir(project_name)` as the DB path
- When not set, fall back to existing `config.chroma_dir` (shared DB, backward compat)

### 3. `SessionManager` (`core/session.py`)

- Read `LLM_MEMORY_PROJECT` env var in `__init__`
- `create_session`: always uses the project being saved (from `project_path` param), not the env var — ensures sessions land in the right DB regardless of MCP context
- `query_sessions` / `list_sessions`: when env var is set and no explicit `project` param, scope to env var's project DB; when no env var and no project, iterate all project DBs and aggregate
- Add `_get_all_project_stores() -> list[ChromaStore]` helper that scans `~/.llm-memory/projects/`

### 4. MCP Tools (`mcp/tools.py`)

No changes needed — tools already accept optional `project` param. The scoping happens inside `SessionManager`.

## Claude Code Configuration

### Global settings (`~/.claude/settings.json`)

Add `SessionEnd` hook so all projects are captured automatically:

```json
{
  "hooks": {
    "SessionEnd": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "llm-memory save --from-claude --auto"
      }]
    }]
  }
}
```

### Per-project settings (`shot-manager/.claude/settings.json`)

Create this file to scope MCP to shot-manager's DB:

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

## Installation

```bash
# Install with summarization support (needs ANTHROPIC_API_KEY for auto-summarize)
pip install -e "C:/Users/seong/projects/llm-memory[llm]"

# Or without summarization (fully offline)
pip install -e "C:/Users/seong/projects/llm-memory"
```

Dev install (`-e`) means code changes to `llm-memory` take effect immediately.

## Migration

Existing sessions in the old shared `~/.llm-memory/chroma/` are **not migrated** automatically. The old DB stays intact; new sessions go to per-project DBs. A future `llm-memory migrate` command could handle this.

## Out of Scope

- Migrating existing sessions from shared DB
- Windows-native path handling in ChromaDB (tested via MSYS bash)
- UI for browsing sessions
- Replication / backup of per-project DBs
