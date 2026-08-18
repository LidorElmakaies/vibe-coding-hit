// Shared placeholder-text generator for the 7 teacher-provided system prompts.
//
// IMPORTANT — read before touching this file: none of the 7 real system prompts have been
// received from the teacher yet (see CLAUDE.md §6, .claude/memory/all-prompts-teacher-provided.md).
// This project's rules forbid us from ever authoring or "improving" prompt content ourselves —
// see CLAUDE.md §2 and docs/rules/security-and-permissions.md. The strings below are NOT prompt
// content; they are inert placeholder markers whose entire purpose is to make it obvious, in the
// running app itself, that a real prompt has not been loaded yet. Replace the corresponding
// prompts/<role>.ts file's exported constant verbatim with the teacher's real text once received —
// do not edit this generator to "guess" at real content.

export type AdvocateRole = "defense-1" | "defense-2" | "prosecution-1" | "prosecution-2";
export type JudgeRole = "judge-1" | "judge-2" | "judge-3";
export type AgentRole = AdvocateRole | JudgeRole;

const ROLE_DESCRIPTION: Record<AgentRole, string> = {
  "defense-1": "Defense Advocate #1 — argues INNOCENT (justify the killing / argue lack of intent).",
  "defense-2": "Defense Advocate #2 — argues INNOCENT, a distinct strategy from Defense #1.",
  "prosecution-1": "Prosecution Advocate #1 — argues GUILTY (and of what specific charge).",
  "prosecution-2": "Prosecution Advocate #2 — argues GUILTY, a distinct theory from Prosecution #1.",
  "judge-1": "Judge #1 — reads the case + all 4 advocate outputs, renders a verdict.",
  "judge-2": "Judge #2 — reads the case + all 4 advocate outputs, renders a verdict.",
  "judge-3": "Judge #3 — reads the case + all 4 advocate outputs, renders a verdict.",
};

export function placeholderPrompt(role: AgentRole): string {
  return (
    `TEACHER-PROVIDED SYSTEM PROMPT — NOT YET RECEIVED. Replace verbatim before running for real.\n\n` +
    `Role: ${role} (${ROLE_DESCRIPTION[role]})\n\n` +
    `This is an inert placeholder, not a real prompt — see prompts/placeholder.ts and CLAUDE.md §2. ` +
    `We (the builders of this project) never author or edit any of the 7 system prompts ourselves; ` +
    `they come from the teacher, verbatim, before a run is meaningful. A run using this placeholder ` +
    `is expected to produce low-quality or off-task output — that is a signal the real prompt hasn't ` +
    `been loaded, not a bug in the pipeline.`
  );
}
