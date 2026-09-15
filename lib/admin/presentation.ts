import {
  AT_SEC_MAX,
  AT_SEC_MIN,
  DISPLAY_KIND,
  FIVE_STEP_DRAFT,
  JOURNEY_V19_DEFAULT_AT_SEC,
  JOURNEY_V19_DEFAULT_TOTAL_SEC,
  JOURNEY_V19_STEPS,
  TOTAL_SEC_MAX,
  TOTAL_SEC_MIN,
  type JourneyV19Step,
} from "./contract.ts";
import { asRecord, failure, type AdminResult } from "./errors.ts";

export type JourneyPhase = { id: JourneyV19Step; atSec: number };

export type PresentationProfile = {
  kind: typeof DISPLAY_KIND;
  profileId: string;
  contractVersion: number;
  steps: JourneyV19Step[];
  phases: JourneyPhase[];
  phaseAtSec: Record<JourneyV19Step, number>;
  totalDurationSec: number;
};

export type PresentationListing = PresentationProfile & {
  revision: number;
  persistence: string;
  schemaReady: boolean;
  schemaApplied: boolean;
  storeStatus: "ready" | "unready";
  operatorSecondsApplied: boolean;
  operatorTimeSettingsComplete: boolean;
  compiledV19IsNotOperatorComplete: boolean;
  fiveStepDraftIgnored?: boolean;
  applied: boolean;
  moneyUntouched: true;
  capUntouched: true;
  gradeUntouched: true;
  engineDeadlineUntouched: true;
  resultUntouched: true;
  settleTriggeredByPresentation: false;
};

export function compiledV19Profile(): PresentationProfile {
  return {
    kind: DISPLAY_KIND,
    profileId: "journey_v19_default",
    contractVersion: 2,
    steps: [...JOURNEY_V19_STEPS],
    phases: JOURNEY_V19_STEPS.map((id) => ({ id, atSec: JOURNEY_V19_DEFAULT_AT_SEC[id] })),
    phaseAtSec: { ...JOURNEY_V19_DEFAULT_AT_SEC },
    totalDurationSec: JOURNEY_V19_DEFAULT_TOTAL_SEC,
  };
}

function hasAt(value: unknown): boolean {
  const row = asRecord(value);
  return Boolean(row && Object.prototype.hasOwnProperty.call(row, "at"));
}

function isFiveStepDraft(value: unknown): boolean {
  const row = asRecord(value);
  if (!row) return false;
  if (row.kind === "execution_policy_day1") return true;
  if (Array.isArray(row.steps) && row.steps[0] === FIVE_STEP_DRAFT[0]) return true;
  const seconds = asRecord(row.phaseSeconds);
  return Boolean(seconds && seconds.product_check != null);
}

function intInRange(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || !Number.isFinite(value)) return null;
  if (value < min || value > max) return null;
  return value;
}

export function validatePresentationProfile(input: unknown): AdminResult<PresentationProfile> {
  const row = asRecord(input);
  if (!row) return failure(400, "INVALID_INPUT", "화면 진행 시간 값이 없어요.");
  if (hasAt(row)) return failure(400, "INVALID_INPUT", "시간 칸은 atSec만 쓸 수 있어요.");
  if (isFiveStepDraft(row)) {
    return failure(400, "INVALID_INPUT", "실행 정책 5단계는 화면 진행 시간으로 쓸 수 없어요.");
  }

  const totalDurationSec = intInRange(
    row.totalDurationSec ?? JOURNEY_V19_DEFAULT_TOTAL_SEC,
    TOTAL_SEC_MIN,
    TOTAL_SEC_MAX,
  );
  if (totalDurationSec == null) {
    return failure(400, "INVALID_INPUT", "전체 시간은 1초에서 600초 사이 정수여야 해요.");
  }

  const map = {} as Record<JourneyV19Step, number>;
  if (Array.isArray(row.phases)) {
    if (row.phases.length !== JOURNEY_V19_STEPS.length) {
      return failure(400, "INVALID_INPUT", "화면 단계는 7개 순서를 지켜야 해요.");
    }
    for (let i = 0; i < JOURNEY_V19_STEPS.length; i += 1) {
      const item = asRecord(row.phases[i]);
      if (!item || hasAt(item) || item.id !== JOURNEY_V19_STEPS[i]) {
        return failure(400, "INVALID_INPUT", "화면 단계 순서 또는 시간 칸이 맞지 않아요.");
      }
      const atSec = intInRange(item.atSec, AT_SEC_MIN, AT_SEC_MAX);
      if (atSec == null) return failure(400, "INVALID_INPUT", `${JOURNEY_V19_STEPS[i]} 초가 올바르지 않아요.`);
      map[JOURNEY_V19_STEPS[i]] = atSec;
    }
  } else if (asRecord(row.phaseAtSec)) {
    const source = asRecord(row.phaseAtSec);
    if (!source || hasAt(source)) return failure(400, "INVALID_INPUT", "시간 칸은 atSec만 쓸 수 있어요.");
    for (const step of JOURNEY_V19_STEPS) {
      const atSec = intInRange(source[step], AT_SEC_MIN, AT_SEC_MAX);
      if (atSec == null) return failure(400, "INVALID_INPUT", `${step} 초가 올바르지 않아요.`);
      map[step] = atSec;
    }
  } else if (row.phases == null && row.phaseAtSec == null) {
    Object.assign(map, JOURNEY_V19_DEFAULT_AT_SEC);
  } else {
    return failure(400, "INVALID_INPUT", "화면 단계 값을 읽을 수 없어요.");
  }

  let prev = -1;
  const phases: JourneyPhase[] = [];
  for (let i = 0; i < JOURNEY_V19_STEPS.length; i += 1) {
    const id = JOURNEY_V19_STEPS[i];
    const atSec = map[id];
    if (i === 0 && atSec !== 0) {
      return failure(400, "INVALID_INPUT", "첫 단계는 0초여야 해요.");
    }
    if (atSec <= prev) {
      return failure(400, "INVALID_INPUT", "각 단계는 이전보다 커야 해요.");
    }
    if (atSec >= totalDurationSec) {
      return failure(400, "INVALID_INPUT", "각 단계는 전체 시간보다 작아야 해요.");
    }
    prev = atSec;
    phases.push({ id, atSec });
  }

  return {
    ok: true,
    status: 200,
    data: {
      kind: DISPLAY_KIND,
      profileId: typeof row.profileId === "string" && row.profileId ? row.profileId : "journey_v19_default",
      contractVersion: typeof row.contractVersion === "number" ? row.contractVersion : 2,
      steps: [...JOURNEY_V19_STEPS],
      phases,
      phaseAtSec: map,
      totalDurationSec,
    },
  };
}

export function previewPresentation(input: unknown): AdminResult<PresentationProfile & { previewOnly: true; participateCreated: false }> {
  const checked = validatePresentationProfile(input);
  if (!checked.ok) return checked;
  return {
    ok: true,
    status: 200,
    data: { ...checked.data, previewOnly: true, participateCreated: false },
  };
}

export function listingFlags(partial: {
  revision?: number;
  persistence?: string;
  schemaReady?: boolean;
  schemaApplied?: boolean;
  storeStatus?: "ready" | "unready";
  operatorSecondsApplied?: boolean;
  applied?: boolean;
  fiveStepDraftIgnored?: boolean;
}): Omit<PresentationListing, keyof PresentationProfile> {
  const schemaReady = partial.schemaReady === true;
  const schemaApplied = partial.schemaApplied === true;
  const persistence = partial.persistence ?? "compiled_v19_schema_unready";
  const operatorSecondsApplied =
    partial.operatorSecondsApplied === true &&
    persistence === "runtime_persist" &&
    schemaReady &&
    schemaApplied;
  return {
    revision: partial.revision ?? 0,
    persistence,
    schemaReady,
    schemaApplied,
    storeStatus: partial.storeStatus ?? (schemaReady ? "ready" : "unready"),
    operatorSecondsApplied,
    operatorTimeSettingsComplete: operatorSecondsApplied,
    compiledV19IsNotOperatorComplete: operatorSecondsApplied !== true,
    fiveStepDraftIgnored: partial.fiveStepDraftIgnored,
    applied: partial.applied === true && operatorSecondsApplied,
    moneyUntouched: true,
    capUntouched: true,
    gradeUntouched: true,
    engineDeadlineUntouched: true,
    resultUntouched: true,
    settleTriggeredByPresentation: false,
  };
}

export function compiledUnreadyListing(): PresentationListing {
  return {
    ...compiledV19Profile(),
    ...listingFlags({
      revision: 0,
      persistence: "compiled_v19_schema_unready",
      schemaReady: false,
      schemaApplied: false,
      storeStatus: "unready",
      applied: false,
    }),
  };
}
