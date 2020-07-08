# Contributing Guide

- [Contributing](#contributing)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Open Development](#open-development)
    - [Branch organisation](#branch-organisation)
    - [Conventional Commits](#conventional-commits)
  - [Found a Bug?](#found-a-bug)
  - [Proposing Changes](#proposing-changes)
    - [Requests for comments](#requests-for-comments)
    - [Sending Pull Requests](#sending-pull-requests)
  - [Development Workflow](#development-workflow)

## Getting started

### Prerequisites

- You have [Node](https://nodejs.org/) installed at v10.0.0+ and [Yarn](https://yarnpkg.com/en/) at v1.2.0+.
- You are familiar with Git

#### Branch organisation

According to our [release schedule](https://github.com/Farfetch/garment/blob/master/CHANGELOG.md), we organize our branches into:

- `master`: is the project permanent branch which should always reflects a production-ready state
- `feat`: If it’s a feature pull request. In this workflow, a new contributor starts from the master branch.
- `fix`: If you need to send a bug fix pull request
- `chore`: If is a small change (update something without impacting the user).

**Branch naming scheme**

- `feat/foo-bar` for new features
- `fix/foo-bar` for bug fixes
- `chore/foo-bar` for anything else. Use chore(docs/style/...) to scope your task.

### Conventional commits

We have very precise rules on how git commit messages should be formatted. **More readable messages** makes the **project history** easier to search.

#### Commit message format

Each commit message must have a **header** that includes the **type**, the **scope** (optional), and the **description**:

```
<type>[optional scope]: <description>
```

**Example:**

```
fix(storybook): Allow fonts to be rendered in storybook.
```

Read more about Conventional Commits and allowed types on [conventionalcommits.org](https://www.conventionalcommits.org).

## Found a bug?

Use [Github Issues](https://github.com/farfetch/garment/issues/new) for bug tracing.

Before reporting a new bug, ensure that the bug was not already reported and is not fixed.

If you find a bug in the source code, you can help us by [submitting an issue](https://github.com/farfetch/garment/issues/new) to our [Git Repository](https://github.com/farfetch/garment/).
Even better, you can [submit a Pull Request](#sending-pull-requests) with a fix.

## Proposing changes

1. To do a “substantial” change - change to the API or introducing a new feature - we highly recommend using our [RFC process](#requests-for-comments).
1. To report a bug, we recommend using our [bug issue tracker](https://github.com/farfetch/garment/issues/) and provide a reproduction of the bug.

### Requests for comments

Many changes, including bug fixes and documentation improvements can be implemented and reviewed via the normal GitHub [pull request workflow](#sending-pull-requests).

Some changes, though, are “substantial” and should be put through a bit of a design process in order to produce a consensus among the core team.

The “RFC” (Request For Comments) process is intended to provide a consistent and controlled path for new features to enter a project. You can create a new RFC document by using the [Feature template](https://github.com/farfetch/garment/issues/new) in the project issues area.

### Sending pull requests

Before submitting a pull request, please make sure you:

1. Clone the repository and create your branch from master.
1. Create a new feature branch.
1. Run `yarn install` in the project root to install project dependencies.
1. Do the necessary developments.
1. Add tests if you’ve fixed a bug or added code that needs to be tested and ensure the test suite passes (`yarn test`).
1. Make sure your code lints (`yarn lint`).
1. Update the project README with details of the changes made to the interface.
1. Rebase your work on top of the base branch.
1. Open a `Pull Request` to master.
1. Code owners should automatically be requested for review your code.
1. Once reviewed and approved, one of the project master/owners will do the merge and the respective release.

## Development workflow

After cloning the project, run `yarn install` to fetch its dependencies. Then, you can run several commands:

- `yarn gr` runs locally built version of Garment. Allows to test changes during the development
- `yarn watch` runs TypeScript compiler in a watch mode which incrementally rebuilds changed files
- `yarn build` builds Garment using TypeScript compiler
- `yarn release` updates the versions of changed Garment's packages and publishes them
