"use client";

// The Console — the entire application UI lives on this one page, per
// docs/interface-brief-console.md and ADR-0015 (supersedes the earlier 3-screen +
// admin-console split). Case input, all 7 agents' config, one Run button, live per-agent
// streamed output, results (verdicts + arguments), a cost/tokens/time summary, and a lightweight
// past-runs history panel — all as components composed here, not separate routes.
//
// Page order (docs/interface-brief-console.md §2, revised 2026-08-18): case input → 7 agent
// panels → model selection → Run control → results (verdicts + summary) → past-runs history.
// Model selection is placed with the panels/Run control (the "configure, then run" part of the
// flow) since it's part of what's configured before pressing Run, same as prompt/max-tokens.
//
// API contract: confirmed directly with the backend agent (2026-08-17) — 5 routes live
// (GET/PUT agent-config, POST run + SSE, GET cases, GET cases/:id). GET /api/models (for the
// model-selection dropdown, added 2026-08-18) was still in progress as of this build — handled
// the same way as any other endpoint that might not exist yet: a genuine loading/unavailable
// state, never a hardcoded fallback list.

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "../components/console/console.module.css";
import {
  fetchAgentConfigs,
  fetchModels,
  fetchPastRunDetail,
  fetchPastRuns,
  runPipeline,
  saveAgentConfig,
} from "../components/console/api";
import AgentPanelGroup from "../components/console/AgentPanelGroup";
import VerdictsSummary from "../components/console/VerdictsSummary";
import RunSummaryBox from "../components/console/RunSummaryBox";
import CaseInputSection from "../components/console/CaseInputSection";
import RunControl from "../components/console/RunControl";
import ModelSelector from "../components/console/ModelSelector";
import PastRunsPanel from "../components/console/PastRunsPanel";
import {
  ADVOCATE_ROLES,
  ALL_ROLES,
  JUDGE_ROLES,
  roleLabel,
  type AgentConfigDTO,
  type AgentRole,
  type AgentRunState,
  type ModelId,
  type ModelSelectionMode,
  type PastRunDetail,
  type PastRunSummary,
  type RunSummary,
  type SaveState,
} from "../components/console/types";

function emptyRunState(status: AgentRunState["status"] = "loading-config"): AgentRunState {
  return { status, streamedText: "" };
}

export default function ConsolePage() {
  const [caseText, setCaseText] = useState("");

  const [configs, setConfigs] = useState<Record<string, AgentConfigDTO | null>>(() =>
    Object.fromEntries(ALL_ROLES.map((r) => [r, null]))
  );
  const [configUnavailable, setConfigUnavailable] = useState(false);

  const [runStates, setRunStates] = useState<Record<string, AgentRunState>>(() =>
    Object.fromEntries(ALL_ROLES.map((r) => [r, emptyRunState()]))
  );
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>(() =>
    Object.fromEntries(ALL_ROLES.map((r) => [r, { state: "idle" } as SaveState]))
  );

  const [running, setRunning] = useState(false);
  const [hasRunStarted, setHasRunStarted] = useState(false);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const [pastRuns, setPastRuns] = useState<PastRunSummary[] | null>(null);
  const [pastRunsError, setPastRunsError] = useState<string | null>(null);
  const [viewingPastRun, setViewingPastRun] = useState<PastRunDetail | null>(null);

  const [models, setModels] = useState<ModelId[] | null>(null);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [modelMode, setModelMode] = useState<ModelSelectionMode>("single");
  const [selectedModel, setSelectedModel] = useState("");
  const [modelApplyState, setModelApplyState] = useState<"idle" | "applying" | "applied" | "failed">(
    "idle"
  );
  const [modelApplyError, setModelApplyError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // Load current agent config on mount. Never fabricate a default prompt/model if this fails —
  // per audit-and-reliability, a missing value must never silently render as if it were real.
  useEffect(() => {
    let cancelled = false;
    fetchAgentConfigs()
      .then((list) => {
        if (cancelled) return;
        const next: Record<string, AgentConfigDTO | null> = {};
        for (const dto of list) next[dto.role] = dto;
        setConfigs(next);
        setRunStates((prev) => {
          const copy = { ...prev };
          for (const role of ALL_ROLES) copy[role] = emptyRunState("idle");
          return copy;
        });
      })
      .catch(() => {
        if (cancelled) return;
        setConfigUnavailable(true);
        setRunStates((prev) => {
          const copy = { ...prev };
          for (const role of ALL_ROLES) copy[role] = emptyRunState("config-unavailable");
          return copy;
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadPastRuns = () => {
    setPastRunsError(null);
    fetchPastRuns()
      .then((runs) => setPastRuns(runs))
      .catch((err) => setPastRunsError(err instanceof Error ? err.message : "unknown error"));
  };

  useEffect(() => {
    let cancelled = false;
    fetchPastRuns()
      .then((runs) => {
        if (!cancelled) setPastRuns(runs);
      })
      .catch((err) => {
        if (!cancelled) setPastRunsError(err instanceof Error ? err.message : "unknown error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // The curated model list — never hardcoded here, always fetched, per
  // docs/interface-brief-console.md §2a. If this fails, model selection genuinely stays
  // unavailable rather than falling back to a guessed list.
  useEffect(() => {
    let cancelled = false;
    fetchModels()
      .then((list) => {
        if (!cancelled) setModels(list);
      })
      .catch((err) => {
        if (!cancelled) setModelsError(err instanceof Error ? err.message : "unknown error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleConfigChange = (role: AgentRole, patch: Partial<Omit<AgentConfigDTO, "role">>) => {
    setConfigs((prev) => {
      const current = prev[role];
      if (!current) return prev;
      return { ...prev, [role]: { ...current, ...patch } };
    });
    setSaveStates((prev) => ({ ...prev, [role]: { state: "idle" } }));
  };

  const handleSaveConfig = (role: AgentRole) => {
    const cfg = configs[role];
    if (!cfg) return;
    setSaveStates((prev) => ({ ...prev, [role]: { state: "saving" } }));
    saveAgentConfig(role, {
      model: cfg.model,
      systemPrompt: cfg.systemPrompt,
      maxTokens: cfg.maxTokens,
    })
      .then((saved) => {
        // The server may clamp maxTokens to the hard cap (1300 advocates / 700 judges) — apply
        // what it actually saved back onto local state so the field reflects reality immediately
        // rather than the un-clamped value the user typed, which would otherwise only correct
        // itself on the next full config reload.
        setConfigs((prev) => ({ ...prev, [role]: saved }));
        setSaveStates((prev) => ({ ...prev, [role]: { state: "saved" } }));
      })
      .catch((err) =>
        setSaveStates((prev) => ({
          ...prev,
          [role]: { state: "failed", message: err instanceof Error ? err.message : "unknown error" },
        }))
      );
  };

  const handleModelModeChange = (mode: ModelSelectionMode) => {
    setModelMode(mode);
    setModelApplyState("idle");
    setModelApplyError(null);
  };

  // "Single model for all": docs/interface-brief-console.md §2a — picking a model from the
  // dropdown IS the apply action, applying it to all 7 agents immediately (PUT ×7), each save
  // reflected in that agent's own panel via the existing per-role saveStates/configs, same as an
  // individual per-agent save.
  const handleSelectModel = async (modelId: string) => {
    setSelectedModel(modelId);
    if (!modelId) return;
    setModelApplyState("applying");
    setModelApplyError(null);
    setSaveStates((prev) => {
      const next = { ...prev };
      for (const role of ALL_ROLES) next[role] = { state: "saving" };
      return next;
    });

    const results = await Promise.allSettled(
      ALL_ROLES.map((role) => saveAgentConfig(role, { model: modelId }))
    );

    let anyFailed = false;
    results.forEach((result, i) => {
      const role = ALL_ROLES[i];
      if (result.status === "fulfilled") {
        setConfigs((prev) => ({ ...prev, [role]: result.value }));
        setSaveStates((prev) => ({ ...prev, [role]: { state: "saved" } }));
      } else {
        anyFailed = true;
        const message = result.reason instanceof Error ? result.reason.message : "unknown error";
        setSaveStates((prev) => ({ ...prev, [role]: { state: "failed", message } }));
      }
    });

    if (anyFailed) {
      setModelApplyState("failed");
      setModelApplyError("One or more agents did not save — check individual panels.");
    } else {
      setModelApplyState("applied");
    }
  };

  /**
   * "Random per agent": re-rolled on every Run, not on mode switch (docs/interface-brief-console.md
   * §2a). Picks an independently random model per agent from the curated list and PUTs each one,
   * returning the freshly-saved configs so handleRun can submit the run with what was actually
   * persisted (and thus what will actually get snapshotted into call_log), not a locally-guessed
   * value that might not match.
   */
  const rerollRandomModels = async (): Promise<Record<string, AgentConfigDTO>> => {
    if (!models || models.length === 0) {
      throw new Error("No curated model list available to pick a random model from.");
    }
    const entries = await Promise.all(
      ALL_ROLES.map(async (role) => {
        const pick = models[Math.floor(Math.random() * models.length)];
        const saved = await saveAgentConfig(role, { model: pick });
        return [role, saved] as const;
      })
    );
    const next = Object.fromEntries(entries) as Record<string, AgentConfigDTO>;
    setConfigs((prev) => ({ ...prev, ...next }));
    return next;
  };

  const blockReason = useMemo(() => {
    if (viewingPastRun) return "Viewing a past run — start a new run to edit.";
    if (!caseText.trim()) return "Charge sheet text is required.";
    if (configUnavailable) return "Agent configuration failed to load — Run is disabled.";
    if (ALL_ROLES.some((r) => !configs[r])) return "Agent configuration is still loading.";
    const emptyAdvocates = ADVOCATE_ROLES.filter((r) => !configs[r]!.systemPrompt.trim());
    if (emptyAdvocates.length > 0) {
      return `Fill in the system prompt for ${emptyAdvocates
        .map((r) => roleLabel(r))
        .join(", ")} — judges need all 4 advocate outputs to rule.`;
    }
    if (modelMode === "random" && (!models || models.length === 0)) {
      return "The curated model list isn't available — required to re-roll random models before running.";
    }
    return null;
  }, [caseText, configUnavailable, configs, viewingPastRun, modelMode, models]);

  const canRun = !running && blockReason === null;

  const handleRun = async () => {
    if (!canRun) return;
    setViewingPastRun(null);
    setSummary(null);
    setRunError(null);
    setHasRunStarted(true);
    setRunning(true);

    // "Random per agent" re-rolls before every Run, not on mode switch — see rerollRandomModels.
    // `configs` (the closed-over state) won't reflect the reroll's PUTs by the time this resolves
    // (React state updates don't land synchronously into this closure), so the freshly-saved
    // values returned directly from the reroll are used to build this run's request instead of
    // re-reading `configs`.
    let effectiveConfigs = configs;
    if (modelMode === "random") {
      try {
        const rerolled = await rerollRandomModels();
        effectiveConfigs = { ...configs, ...rerolled };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not re-roll random models before running.";
        setRunError(message);
        setRunning(false);
        return;
      }
    }

    const blockedJudges = JUDGE_ROLES.filter((r) => !effectiveConfigs[r]!.systemPrompt.trim());
    const runnableRoles = ALL_ROLES.filter((r) => !blockedJudges.includes(r));

    setRunStates(() => {
      const next: Record<string, AgentRunState> = {};
      for (const role of ALL_ROLES) {
        next[role] = blockedJudges.includes(role)
          ? emptyRunState("blocked-empty-prompt")
          : emptyRunState("idle");
      }
      return next;
    });

    const controller = new AbortController();
    abortRef.current = controller;

    const agentsToSubmit: AgentConfigDTO[] = runnableRoles.map((r) => effectiveConfigs[r]!);

    // Shared by both failure paths: a `run-failed` SSE event arriving mid-stream, and the request
    // itself throwing (network error, non-OK response, malformed frame). Either way, any panel
    // that isn't already a terminal state (done/failed/blocked) must flip to failed — a panel left
    // on "running" after the run is known to be over would look like it's still in progress,
    // which is exactly the "failure must look like failure" rule this screen exists to satisfy.
    const markUnfinishedAsFailed = (message: string) => {
      setRunStates((prev) => {
        const next = { ...prev };
        for (const role of runnableRoles) {
          if (next[role]?.status === "running" || next[role]?.status === "idle") {
            next[role] = { ...next[role], status: "failed", errorMessage: message };
          }
        }
        return next;
      });
    };

    try {
      await runPipeline(
        caseText,
        agentsToSubmit,
        (event) => {
          switch (event.type) {
            case "agent-status":
              setRunStates((prev) => ({
                ...prev,
                [event.role]: { ...prev[event.role], status: "running" },
              }));
              break;
            case "agent-delta":
              setRunStates((prev) => ({
                ...prev,
                [event.role]: {
                  ...prev[event.role],
                  status: "running",
                  streamedText: (prev[event.role]?.streamedText ?? "") + event.textDelta,
                },
              }));
              break;
            case "agent-done":
              setRunStates((prev) => ({
                ...prev,
                [event.role]: {
                  ...prev[event.role],
                  status: "done",
                  streamedText: event.output,
                  judgeResult: event.judgeResult,
                },
              }));
              break;
            case "agent-failed":
              setRunStates((prev) => ({
                ...prev,
                [event.role]: {
                  ...prev[event.role],
                  status: "failed",
                  errorMessage: event.errorMessage,
                },
              }));
              break;
            case "summary":
              setSummary({
                totalCostUsd: event.totalCostUsd,
                totalTokens: event.totalTokens,
                totalTimeMs: event.totalTimeMs,
              });
              break;
            case "run-failed":
              setRunError(event.errorMessage);
              markUnfinishedAsFailed(event.errorMessage);
              break;
            case "run-done":
              break;
          }
        },
        controller.signal
      );
    } catch (err) {
      // The run endpoint itself is unreachable/errored before or during streaming — this must
      // render as a visible failure, not silently leave panels stuck on "idle" looking like
      // nothing happened.
      const message = err instanceof Error ? err.message : "Could not reach the run endpoint.";
      setRunError(message);
      markUnfinishedAsFailed(message);
    } finally {
      setRunning(false);
      loadPastRuns();
    }
  };

  const handleOpenPastRun = (id: string) => {
    setPastRunsError(null);
    fetchPastRunDetail(id)
      .then((detail) => {
        setViewingPastRun(detail);
        setCaseText(detail.caseText);
        setSummary(detail.summary);
        setHasRunStarted(true);
        const nextConfigs: Record<string, AgentConfigDTO | null> = {};
        const nextRunStates: Record<string, AgentRunState> = {};
        for (const agent of detail.agents) {
          nextConfigs[agent.role] = {
            role: agent.role,
            model: agent.model,
            systemPrompt: agent.systemPrompt,
            maxTokens: agent.maxTokens,
          };
          nextRunStates[agent.role] = agent.failed
            ? { status: "failed", streamedText: "", errorMessage: "This call failed during the original run." }
            : { status: "done", streamedText: agent.output ?? "", judgeResult: agent.judgeResult };
        }
        setConfigs(nextConfigs);
        setRunStates(nextRunStates);
      })
      .catch((err) =>
        setPastRunsError(err instanceof Error ? err.message : "Could not open that run.")
      );
  };

  const handleBackToNewRun = () => {
    setViewingPastRun(null);
    setCaseText("");
    setSummary(null);
    setHasRunStarted(false);
    setModelApplyState("idle");
    setModelApplyError(null);
    setRunStates(Object.fromEntries(ALL_ROLES.map((r) => [r, emptyRunState("idle")])));
  };

  const editingDisabled = running || !!viewingPastRun;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>The Tribunal — Console</h1>
        <p>Configure the case and all 7 agents, run the deliberation, and read the verdicts.</p>
      </header>

      {viewingPastRun && (
        <div className={styles.banner}>
          <span>
            Viewing past run from {new Date(viewingPastRun.submittedAt).toLocaleString()}{" "}
            (read-only).
          </span>
          <button type="button" className={styles.linkButton} onClick={handleBackToNewRun}>
            Start a new run
          </button>
        </div>
      )}

      {runError && (
        <div className={styles.errorNote} role="alert">
          Run error: {runError}
        </div>
      )}

      {/* 1. Case input — the thing filled in first. */}
      <CaseInputSection caseText={caseText} onChangeCaseText={setCaseText} disabled={editingDisabled} />

      {/* 2. The 7 agent config panels, grouped by role — configure before you run. */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>Agents</div>
        <AgentPanelGroup
          heading="Defense"
          roles={ADVOCATE_ROLES.filter((r) => r.startsWith("defense"))}
          configs={configs}
          configUnavailable={configUnavailable}
          runStates={runStates}
          saveStates={saveStates}
          disabled={editingDisabled}
          onChange={handleConfigChange}
          onSave={handleSaveConfig}
        />
        <AgentPanelGroup
          heading="Prosecution"
          roles={ADVOCATE_ROLES.filter((r) => r.startsWith("prosecution"))}
          configs={configs}
          configUnavailable={configUnavailable}
          runStates={runStates}
          saveStates={saveStates}
          disabled={editingDisabled}
          onChange={handleConfigChange}
          onSave={handleSaveConfig}
        />
        <AgentPanelGroup
          heading="Judges"
          roles={JUDGE_ROLES}
          configs={configs}
          configUnavailable={configUnavailable}
          runStates={runStates}
          saveStates={saveStates}
          disabled={editingDisabled}
          onChange={handleConfigChange}
          onSave={handleSaveConfig}
        />
      </section>

      <ModelSelector
        models={models}
        modelsError={modelsError}
        mode={modelMode}
        selectedModel={selectedModel}
        applyState={modelApplyState}
        applyError={modelApplyError}
        disabled={editingDisabled}
        onModeChange={handleModelModeChange}
        onSelectModel={handleSelectModel}
      />

      {/* 3. The Run control. */}
      <RunControl onRun={handleRun} runDisabled={!canRun} running={running} blockReason={blockReason} />

      {/* 4. Results — the 3 verdicts together + reasons + run summary — "the end" of the main
          flow, appearing once a run has actually happened, not before. */}
      <VerdictsSummary runStates={runStates} hasRunStarted={hasRunStarted} />
      <RunSummaryBox summary={summary} running={running} />

      {/* 5. Past-runs history, last — browsed separately from the main flow. */}
      <PastRunsPanel runs={pastRuns} loadError={pastRunsError} onOpen={handleOpenPastRun} />
    </main>
  );
}
