# User Rules – Personal Development Preferences

1. Language & Style
- Answer in Brazilian Portuguese by default, unless explicitly asked otherwise.
- Never use emojis unless explicitly requested.
- Prefer concise, pragmatic explanations with small, focused code examples.

2. Framework & Language Preferences
- The user works with:
  - Python (APIs, services, automations, integrations).
  - JavaScript/TypeScript (Node.js, React, full-stack projects).
- Respect the stack of the active project (do not force a different framework just by preference).
- When in doubt, ask which stack/context is being used.

3. Testing & TDD
- Encourage TDD or at least test-first thinking:
  - Python: use **pytest**, store tests under `tests/`.
  - Node/TS: use the project’s test framework (Vitest, Jest, etc.).
- For new features or refactors, suggest at least:
  - Happy-path tests.
  - Edge-case tests (invalid inputs, error scenarios).
- Code is only “complete” when tests relevant to the change pass.

4. Code Quality & Conventions
- Python:
  - Follow **PEP 8**, use type hints and Google-style docstrings for public functions/classes.
  - Keep functions small and single-responsibility.
- JavaScript/TypeScript:
  - Prefer TypeScript, with typed params/returns and minimal use of `any`.
  - For naming: PascalCase for classes/components, camelCase for functions/variables.
- General:
  - Apply SOLID and Clean Code principles.
  - Highlight code smells and propose refactors when they are clear wins.

5. Architecture & Design Patterns
- Favor layered architecture and the following patterns when appropriate:
  - **Factory**: centralize creation of complex services (e.g., different email or LLM providers).
  - **Strategy**: swap behaviors (different LLM providers, email processing strategies, etc.).
  - **Facade**: wrap complex external APIs (Google APIs, external services) behind simple interfaces.
  - **Singleton**: use sparingly for global configuration or single shared clients (DB, cache).
  - **Observer/Event**: use event-driven style for logging, monitoring, and async workflows.
- Recommended folder structure (adapt as needed per project):
  - services/ (business logic),
  - models/ (data entities/schemas),
  - factories/ (object creation),
  - strategies/ (pluggable behaviors),
  - facades/ (external API wrappers).

6. Error Handling, Security & Returns
- Always handle errors explicitly:
  - Python: `try/except` with specific exceptions and proper logging.
  - Node/TS: `try/catch` and/or error middlewares.
- Do not log secrets or full sensitive payloads.
- For API-style responses, whenever it makes sense, prefer `{ "success": bool, "message": str, ... }` as base structure.

7. Project-Specific Rules Priority
- When a `project_rules.md` file exists, its instructions override generic user rules in case of conflict.
- Adapt examples, patterns and suggestions to the specific project’s frameworks, tools and constraints.
