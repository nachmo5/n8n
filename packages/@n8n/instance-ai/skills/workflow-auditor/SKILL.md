---
name: workflow-auditor
description: Use when reviewing n8n workflow exports for correctness, maintainability, credential safety, and likely runtime failures.
recommended_tools:
  - read_file
  - write_file
  - bash
platforms:
  - daytona
---

# Workflow Auditor

Review n8n workflow exports and produce a concise production-readiness audit.

## Procedure

1. Read the workflow JSON from the path the user provides.
2. Use `references/audit-rubric.md` when you need the review criteria.
3. Run the deterministic analysis helper for JSON workflow exports:

```bash
node ${N8N_SKILL_DIR}/scripts/audit-workflow.mjs <workflow-json-path>
```

4. Read `${N8N_WORKSPACE_DIR}/workflow-audit-helper.json`.
5. Prepare the final human-readable audit as a markdown artifact in your final
   response. Do not mention `${N8N_WORKSPACE_DIR}` or any other sandbox path to
   the user.
6. Report the top risks, recommended fixes, and whether the workflow is safe to
   activate.

## Output

Create the full audit as a markdown artifact using this exact command format:

```text
<command:artifact-create>
<title>Workflow audit</title>
<type>md</type>
<content>
...full audit markdown...
</content>
</command:artifact-create>
```

After the artifact command, keep the visible final response short and
operational:

- activation verdict: safe, risky, or unsafe
- top production risks
- concrete remediation steps
- any assumptions or missing context
