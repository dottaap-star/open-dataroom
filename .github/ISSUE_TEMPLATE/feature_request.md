---
name: Feature request
about: Suggest an enhancement that would benefit most forkers
title: "[feature] "
labels: enhancement
assignees: ''
---

## The problem

What are you trying to do that the template doesn't help with today? Be concrete. "It's hard to add a third tier" is a problem; "I'd like a setting for it" is a proposed solution — please describe the problem first, the solution second.

## Who else has this problem

Features land in upstream when they help most forkers, not just one deployment. Sketch the audience: investor-data-room operators in general? Anthropic users specifically? People deploying outside Vercel?

If your feature is specific to one type of fork, it may be a better fit for your own fork than the template — see [CONTRIBUTING.md](../../CONTRIBUTING.md) for the scope philosophy.

## Proposed solution

What you'd build, in enough detail that a maintainer can react. Include:

- Which files would change (best guess).
- Whether `dataroom.config.ts` gains a new field — and what its default should be (defaults should preserve current behaviour).
- Whether `npm run setup` gains a new prompt — and whether the prompt is mandatory or skippable.
- Migration story for existing forks if the change is breaking.

## Alternatives considered

What other approaches did you think about, and why did you discard them?

## Out-of-scope check

Have you read the non-goals list in [CONTRIBUTING.md](../../CONTRIBUTING.md)? If your feature is on that list, please describe why the project's current position is wrong — that conversation should happen before any code.
