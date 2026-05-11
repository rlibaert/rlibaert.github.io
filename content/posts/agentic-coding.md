---
date: '2026-05-10T13:12:54Z'
draft: false
title: 'Agentic coding'
tags:
- ai
- development
---

AI has definitely transformed a lot of industries and software development is not
spared. While this technology is still young and changing, some standards are now
emerging.

## Agentic code editors

Most IDEs now make use of AI models, either directly or via extensions, to
provide powerful features and enhance the development experience. VSCode has
been the standard for a long time and is still extremely popular, but the rise
of AI helped changing the landscape. [Cursor](https://cursor.sh/) is one of
those, but to me [Zed](https://zed.dev/) is the most innovative (several IDEs
are VScode forks, this one is built from the ground up).

The most immediate interest of such tools is to reduce the distance between
production code and the AI model, allowing it to directly read and write the
codebase, providing context-aware code completion and refactoring suggestions.

## Agent rules

Agent rules are a set of guidelines that define how an agent should behave and
interact with the developer, providing a consistent behavior accross sessions
and teams. This ruleset is basically a prompt loaded into the model's context
at the start of each session. This concept is shared among different providers
(e.g. `.cursor/rules`, `CLAUDE.md`, `GEMINI.md`, ...). I prefer the agnostic
approach and use `AGENTS.md`, which seems to be rising as a standard.

As specified previously, since the rules are loaded in the model's context, the
same guidelines for good prompting apply. A good `AGENTS.md` file should
provide clear and concise instructions to specialize the agent efficiently
while keeping the context size manageable.

There exists [generative tools](http://agentrulegen.com/builder) that can help
grasp the idea of what a good `AGENTS.md` file should look like and get you
started. You can also definitely get inspiration from [open-source projects](https://github.com/zed-industries/zed/blob/main/.rules).

{{< details summary="An example for Go projects" >}}

````markdown
# AGENTS.md

## Context

You are an expert Golang developer.
This repository contains a Golang API backend.

## Project structure

The project follows a hexagonal architecture with clear separation of concerns:

- **domain/** - Business logic, entities & interfaces... this is the heart of
  the application
- **domaintest/** - Reusable testing suites for domain implementations
- **datastores/** - Domain's storage interfaces implementations
- **restapi/** - An HTTP interface to drive domain: its main components are a
  service registerer wrapping a domain service to register HTTP handlers,
  presentation models with mappings to domain models and an HTTP client.
- **wrappers/** - Decorators around domain interfaces to augment behavior
  (e.g. logs & metrics production).
- **cmd/api-server/** - API server entrypoint

## Coding guidelines

- Do not write organizational or code-summary comments but do write comments to
  explain tricky code blocks
- Reserve `panic` for truly unrecoverable errors
- Never silenty discard errors; handle them ASAP with `if err != nil { ... }`
- Return `error` last in function output lists
- Use `context.Context` when available and set `ctx context.Context` first in
  function input lists
- Use Generics to implement small, generic functions:
  ```go
  func _[T comparable](a, b T) bool { return a == b } // do
  func _(a, b int) bool             { return a == b } // don't
  ```
- Use `[package.symbol]` notation in comments when referring to types,
  constants, variables, functions ...
- Specialize primitive types when relevant (e.g. `type PersonID string`)
- Define relevant sentinel domain errors to be wrapped over
  implementation-specific errors:
  ```go
  var ErrPersonUnknown = errors.New("domain: person unknown")
  func _(ctx context.Context, id PersonID) error {
    err := ...
    if errors.Is(err, errSuggestingUnknownPerson) {
      return errors.Join(ErrPersonUnknown, err)
    }
  }
  ```

## Testing guidelines

- Run `golangci-lint run ./...` to run linters ([configuration](.golangci.yaml))
- Run `go test ./...` to run all tests, with optional flags:
  - `-artifacts`: persist test artifacts
  - `-cover`: coverage analysis
  - `-race`: data races detection
  - `-bench regexp`: run matching benchmark tests
  - `-fuzz regexp`: run matching fuzz tests
- Run tests & linter and resolve issues when editing code
- If you are unable to provide a simple fix for a linter error, you may instead
  suggest to append the line with `//nolint: <linter> // <explanation>` to
  suppress the warning
- End test code files in `_test.go` and suffix test packages with `_test`
- Use `testing.TB.Context()` to fill `context.Context` arguments

## Dependency management

| Key dependency | Purpose |
| - | - |
| `log/slog` | Structured logging |

Only if necessary, you may ask to:

- Use `go get <import path>` to add a new dependency
- Use `go mod tidy` to tidy up [go.mod](go.mod)
- Use `go get -u ./...` to update modules
- Use `go mod vendor` to create or refresh [vendor](vendor) (not versioned) and
  fix vendoring issues
````

{{< /details >}}

<!--## Agent skills-->

<!--## References-->
<!---->
<!--- <https://agentic-coding.github.io/>-->
<!--- <http://agentrulegen.com/builder>-->
<!--- <https://github.com/zed-industries/zed/blob/main/.rules>-->
