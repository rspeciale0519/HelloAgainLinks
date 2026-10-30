## Working with Claude Opus 5.5

### 1. Effort: medium by default
- Run every session at **medium** effort unless the task says otherwise.
- Use high, xhigh or max only for jobs where we've seen it make a real difference (for example tricky debugging or a big refactor). Note why in the task or PR.
- Don't raise effort just to be safe. It costs more and runs slower.

### 2. No "think carefully" lines
- Don't add "think carefully", "think step by step", "take a deep breath" or similar lines to prompts, skills or these files. Opus 5.5 always thinks, so those lines only slow replies.
- If you find one, remove it as part of normal cleanup.

### 3. Long unattended runs: checklist + 3 auto-continues max
- Before a long run, write the plan as a checklist in `TASKS.md` (or the task's own checklist file), with one line per step and a clear pass/fail check (tests pass, build succeeds, page loads).
- Before stopping, read the checklist. If items are still open, keep going.
- Auto-continue **at most 3 times**. After the 3rd, stop and report: what's done, what's left, and what's blocking.
- Never mark an item done unless its check actually passed.

### 4. Refusals aren't crashes
- If a run stops with a refusal, read the refusal category before treating it as a crash or retrying. Security-review prompts can trip the cybersecurity safeguard; reword the task's purpose instead of looping.

### 5. UI work: specific design bans
- For UI work, give specific design bans (for example no gradients, no emoji icons, no centered walls of text) instead of "make it look good".
