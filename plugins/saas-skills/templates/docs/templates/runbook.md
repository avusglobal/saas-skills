# Runbook — <Operating procedure title>

<!--
Filename: docs/runbooks/<slug>.md
A runbook is executable prose: someone (or some agent) follows it under
pressure without asking anyone. Numbered steps, exact commands, expected
outputs, and a troubleshooting section. Link the ADRs/issues that motivated it.
-->

Covers <what this runbook operates> ([ADR NNNN](../adrs/NNNN-slug.md)).

## Environment matrix

<!-- One row per stage; which config/keys/behavior apply where. -->

| Stage | Key config | Behavior |
| --- | --- | --- |
| production | ... | ... |
| preview/staging | ... | ... |
| local dev | ... | ... |

## Procedure — <main flow>

1. ...
2. ...
3. Verify: <observable check that proves the step worked>.

## Rotation / rollback

<!-- How to undo or rotate safely. If a rollback is untested, say so. -->

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| ... | ... | ... |

## Smoke test

<!-- The minimal end-to-end check that proves the system works after a change. -->
