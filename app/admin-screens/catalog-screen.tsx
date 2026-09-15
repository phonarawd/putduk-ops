"use client";

import { useEffect, useRef, useState } from "react";
import { COPY } from "../../lib/admin/copy";
import { PRODUCT_VISIBILITY, isUuid, type ProductVisibility } from "../../lib/admin/contract";
import {
  parseMemberIdLines,
  parsePhotoLines,
  persistBodyFromDraft,
  productMoneyLines,
  validateOperatorProductDraft,
  visibilityLabelKo,
} from "../../lib/admin/product";
import { isPayoutComplete, moneyDisplayLines } from "../../lib/admin/money-authority";
import { resolveOrigin } from "../../lib/admin/origin";
import type { AdminResult } from "../../lib/admin/errors";
import type { OperatorProduct } from "../../lib/admin/product";
import type { AdminOpsPort, ConfirmDraft, ParticipationRow } from "../../lib/admin/types";
import { ConfirmDialog, DraftBanner, Field, ResultBanner, WaitBanner } from "./shared";

const emptyForm = {
  name: "",
  description: "",
  photos: "",
  compositionQty: "1",
  payoutAmount: "",
  visibility: "all_public" as ProductVisibility,
  selectedMemberIds: "",
  operatorMemo: "",
  baseAmount: "",
  costAmount: "",
};

function formFromProduct(product: OperatorProduct) {
  return {
    name: product.name,
    description: product.description,
    photos: product.photos.join("\n"),
    compositionQty: String(product.compositionQty),
    payoutAmount: product.payoutAmount,
    visibility: product.visibility,
    selectedMemberIds: product.selectedMemberIds.join("\n"),
    operatorMemo: product.priceConfirmationMemo,
    baseAmount: "",
    costAmount: "",
  };
}

function previewLines(
  persist: ReturnType<typeof persistBodyFromDraft>,
  extras: { baseAmount: string; costAmount: string },
  incoming?: unknown,
) {
  return [
    `이름: ${persist.name}`,
    `구성 수량: ${persist.compositionQty} · 판매 재고 아님`,
    `공개: ${visibilityLabelKo(persist.visibility)}`,
    persist.visibility === "selected_members"
      ? `선택 회원 ${persist.selectedMemberIds.length}명 · 독점 예약 아님`
      : "조건 충족 회원이 동시에 참여할 수 있음",
    persist.description ? `설명: ${persist.description}` : "설명 없음",
    persist.photos.length ? `사진 ${persist.photos.length}장` : "사진 없음",
    ...productMoneyLines(persist, incoming),
    persist.priceConfirmationMemo
      ? `가격 확인 메모(persist): ${persist.priceConfirmationMemo}`
      : "가격 확인 메모 없음",
    "시스템 가격 검증 완료가 아닙니다.",
    "아래 제안 필드는 서버에 보내지 않아요.",
    extras.baseAmount.trim() ? `제안 기준 금액: ${extras.baseAmount}` : "제안 기준 금액: 없음",
    extras.costAmount.trim() ? `제안 비용: ${extras.costAmount}` : "제안 비용: 없음",
    COPY.catalogResellerHidden,
  ].join("\n");
}

export function CatalogScreen({
  adapter,
  notify,
}: {
  adapter: AdminOpsPort;
  notify: (message: string, ok?: boolean) => void;
}) {
  const origin = resolveOrigin();
  const [view, setView] = useState<"list" | "form">("list");
  const [listItems, setListItems] = useState<OperatorProduct[]>([]);
  const [listBusy, setListBusy] = useState(true);
  const [listError, setListError] = useState<AdminResult<unknown> | null>(null);
  const [listUnready, setListUnready] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [preview, setPreview] = useState<string>("");
  const [error, setError] = useState<AdminResult<unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<ConfirmDraft | null>(null);
  const [pending, setPending] = useState<null | (() => Promise<void>)>(null);
  const [knownId, setKnownId] = useState("");
  const [lastProduct, setLastProduct] = useState<OperatorProduct | null>(null);
  const [rows, setRows] = useState<ParticipationRow[] | null>(null);
  const genRef = useRef(0);
  const busyRef = useRef(false);

  const applyListResult = (res: Awaited<ReturnType<AdminOpsPort["listProducts"]>>) => {
    if (!res.ok) {
      setListItems([]);
      setListError(res);
      setListUnready(false);
      setListBusy(false);
      return;
    }
    setListError(null);
    setListItems(res.data.items);
    setListUnready(res.data.storeStatus === "unready");
    setListBusy(false);
  };

  const refreshList = async () => {
    const res = await adapter.listProducts();
    applyListResult(res);
  };

  useEffect(() => {
    let alive = true;
    void adapter.listProducts().then((res) => {
      if (!alive) return;
      applyListResult(res);
    });
    return () => {
      alive = false;
    };
  }, [adapter]);

  const checked = validateOperatorProductDraft({
    name: form.name,
    description: form.description,
    photos: parsePhotoLines(form.photos),
    compositionQty: form.compositionQty,
    payoutAmount: form.payoutAmount,
    visibility: form.visibility,
    selectedMemberIds: parseMemberIdLines(form.selectedMemberIds),
    priceConfirmationMemo: form.operatorMemo,
  });

  const targetId = knownId.trim() || lastProduct?.id || "";
  const expectedRevision = lastProduct && lastProduct.id === targetId ? lastProduct.revision : undefined;

  const openRegister = () => {
    genRef.current += 1;
    setForm(emptyForm);
    setPreview("");
    setError(null);
    setDraft(null);
    setPending(null);
    setKnownId("");
    setLastProduct(null);
    setRows(null);
    setView("form");
  };

  const openEdit = (product: OperatorProduct) => {
    genRef.current += 1;
    setForm(formFromProduct(product));
    setPreview("");
    setError(null);
    setDraft(null);
    setPending(null);
    setKnownId(product.id);
    setLastProduct(product);
    setRows(null);
    setView("form");
  };

  const backToList = () => {
    if (busyRef.current || busy) return;
    setDraft(null);
    setPending(null);
    setView("list");
    void refreshList();
  };

  const runPreview = () => {
    if (!checked.ok) {
      setError(checked);
      setPreview("");
      return;
    }
    setError(null);
    const persist = persistBodyFromDraft(checked.data);
    setPreview(previewLines(persist, form));
  };

  const applyProduct = (product: OperatorProduct, gen: number) => {
    if (gen !== genRef.current) return;
    setLastProduct(product);
    setKnownId(product.id);
    setPreview(previewLines(product, form, product));
  };

  const finishWrite = async (
    res: AdminResult<{ product: OperatorProduct; applied: boolean }>,
    gen: number,
    expectedId?: string,
  ) => {
    if (gen !== genRef.current) {
      busyRef.current = false;
      return;
    }
    if (expectedId && targetId && expectedId !== targetId) {
      busyRef.current = false;
      return;
    }
    busyRef.current = false;
    setBusy(false);
    setDraft(null);
    setPending(null);
    if (!res.ok) {
      setError(res);
      notify(res.message, false);
      return;
    }
    if (!res.data.applied) {
      notify(COPY.noFakeComplete, false);
      return;
    }
    notify("서버가 확인한 상품을 다시 받았어요.", true);
    setError(null);
    applyProduct(res.data.product, gen);
    void refreshList();
  };

  const saveRegister = async () => {
    if (busyRef.current || busy || !checked.ok) return;
    const gen = genRef.current;
    busyRef.current = true;
    setBusy(true);
    const res = await adapter.registerProduct(checked.data);
    await finishWrite(res, gen);
  };

  const saveUpdate = async () => {
    if (busyRef.current || busy || !checked.ok || !isUuid(targetId)) return;
    const gen = genRef.current;
    const expectedId = targetId;
    busyRef.current = true;
    setBusy(true);
    const res = await adapter.updateProduct(expectedId, {
      ...persistBodyFromDraft(checked.data),
      expectedRevision,
    });
    await finishWrite(res, gen, expectedId);
  };

  const saveVisibility = async () => {
    if (busyRef.current || busy || !checked.ok || !isUuid(targetId)) return;
    const gen = genRef.current;
    const expectedId = targetId;
    busyRef.current = true;
    setBusy(true);
    const res = await adapter.updateProductVisibility(expectedId, {
      visibility: checked.data.visibility,
      selectedMemberIds: checked.data.selectedMemberIds,
      expectedRevision,
    });
    await finishWrite(res, gen, expectedId);
  };

  const loadParticipations = async () => {
    if (busyRef.current || busy || !isUuid(targetId)) return;
    const gen = ++genRef.current;
    const expectedId = targetId;
    busyRef.current = true;
    setBusy(true);
    const res = await adapter.listParticipations(expectedId);
    if (gen !== genRef.current || expectedId !== targetId) {
      busyRef.current = false;
      setBusy(false);
      return;
    }
    busyRef.current = false;
    setBusy(false);
    if (!res.ok) {
      setRows(null);
      setError(res);
      notify(res.message, false);
      return;
    }
    setError(null);
    setRows(res.data.items);
    if (res.data.storeStatus === "unready") {
      notify(COPY.storeUnready, false);
    }
  };

  if (view === "list") {
    return (
      <>
        {origin.mode !== "live" ? (
          <DraftBanner>
            {COPY.catalogS2} {COPY.catalogPersistUnready}
          </DraftBanner>
        ) : null}
        <ResultBanner result={listError} />
        {listUnready ? <WaitBanner>{COPY.storeUnready}</WaitBanner> : null}
        <section className="panel" data-testid="catalog-list">
          <div className="panelhead">
            <div>
              <h2>등록된 상품</h2>
              <p>서버가 준 목록만 보여 줍니다. 없는 통계는 만들지 않아요.</p>
            </div>
            <button type="button" className="primary" data-testid="catalog-register" onClick={openRegister}>
              상품 등록
            </button>
          </div>
          {listBusy ? <p className="ops-hint">{COPY.catalogListLoading}</p> : null}
          {!listBusy && listError ? <p className="ops-hint">{COPY.catalogListUnavailable}</p> : null}
          {!listBusy && !listError && listItems.length === 0 ? (
            <p className="ops-hint" data-testid="catalog-list-empty">
              {COPY.catalogListEmpty}
            </p>
          ) : null}
          {!listBusy && listItems.length > 0 ? (
            <div className="tasklist">
              {listItems.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  data-testid="catalog-product-row"
                  data-product-id={product.id}
                  onClick={() => openEdit(product)}
                >
                  <span className="taskcopy">
                    <b>{product.name}</b>
                    <small>
                      {visibilityLabelKo(product.visibility)} · 설정 {product.payoutAmount} {product.currency} ·{" "}
                      {product.id}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </section>
      </>
    );
  }

  return (
    <>
      {origin.mode !== "live" ? (
        <DraftBanner>
          {COPY.catalogS2} {COPY.catalogPersistUnready}
        </DraftBanner>
      ) : (
        <p className="ops-hint">{COPY.catalogS2}</p>
      )}
      <WaitBanner>{COPY.catalogNoGet}</WaitBanner>
      <WaitBanner>{COPY.catalogMemoHint}</WaitBanner>
      <p className="ops-hint">{COPY.catalogConcurrent}</p>
      <p className="ops-hint">{COPY.catalogSnapshot}</p>
      <p className="ops-hint">{COPY.catalogIdempotency}</p>
      <ResultBanner result={error} />
      <div className="ops-actions" style={{ marginBottom: 12 }}>
        <button type="button" data-testid="catalog-back-to-list" disabled={busy} onClick={backToList}>
          목록으로
        </button>
      </div>
      <section className="panel">
        <div className="panelhead">
          <div>
            <h2>상품 등록 전 확인</h2>
            <p>기존 기회 가격 PATCH나 회원별 hide/show 덮어쓰기로 공개 범위를 바꾸지 않아요.</p>
          </div>
        </div>
        <div className="ops-form">
          <Field label="상품 이름">
            <input
              data-testid="catalog-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="설명">
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="사진 주소" hint="한 줄에 하나. 비워도 됩니다.">
            <textarea value={form.photos} onChange={(e) => setForm({ ...form, photos: e.target.value })} />
          </Field>
          <Field label="구성 수량" hint="판매 재고가 아닙니다.">
            <input
              data-testid="catalog-qty"
              value={form.compositionQty}
              onChange={(e) => setForm({ ...form, compositionQty: e.target.value })}
              inputMode="numeric"
            />
          </Field>
          <Field label="설정 지급액 (USDT)" hint={COPY.catalogPayoutHint}>
            <input
              data-testid="catalog-payout"
              value={form.payoutAmount}
              onChange={(e) => setForm({ ...form, payoutAmount: e.target.value })}
            />
          </Field>
          <Field label="기준 금액 (제안)" hint="CJS persist 필드가 아닙니다. 전송하지 않아요.">
            <input value={form.baseAmount} onChange={(e) => setForm({ ...form, baseAmount: e.target.value })} />
          </Field>
          <Field label="비용 (제안)" hint="CJS persist 필드가 아닙니다. 전송하지 않아요.">
            <input value={form.costAmount} onChange={(e) => setForm({ ...form, costAmount: e.target.value })} />
          </Field>
          <Field label="공개 범위" hint="전체 공개가 기본. 선택 공개는 권한이지 독점 예약이 아닙니다.">
            <select
              data-testid="catalog-visibility"
              value={form.visibility}
              onChange={(e) => setForm({ ...form, visibility: e.target.value as ProductVisibility })}
            >
              {PRODUCT_VISIBILITY.map((v) => (
                <option key={v} value={v}>
                  {visibilityLabelKo(v)}
                </option>
              ))}
            </select>
          </Field>
          {form.visibility === "selected_members" ? (
            <Field label="선택 회원 번호" hint="UUID를 쉼표나 줄로 구분. 여러 회원도 같은 상품에 동시 참여할 수 있어요.">
              <textarea
                data-testid="catalog-members"
                value={form.selectedMemberIds}
                onChange={(e) => setForm({ ...form, selectedMemberIds: e.target.value })}
              />
            </Field>
          ) : null}
          <Field label="가격 확인 메모" hint={COPY.catalogMemoHint}>
            <textarea
              data-testid="catalog-memo"
              value={form.operatorMemo}
              onChange={(e) => setForm({ ...form, operatorMemo: e.target.value })}
            />
          </Field>
          <div className="ops-actions">
            <button type="button" data-testid="catalog-preview" onClick={runPreview}>
              등록 전 미리보기
            </button>
            <button
              type="button"
              className="primary"
              data-testid="catalog-save"
              disabled={busy || !checked.ok}
              onClick={() => {
                setPending(() => saveRegister);
                setDraft({
                  title: "이 상품을 실서버에 등록할까요?",
                  targetLabel: checked.ok ? checked.data.name : form.name,
                  currentLabel: "저장 전",
                  nextLabel: checked.ok
                    ? `${visibilityLabelKo(checked.data.visibility)} · 설정 ${checked.data.payoutAmount} USDT`
                    : "검증 실패",
                  impact:
                    "저장소가 준비되지 않으면 503이며 완료가 아닙니다. 메모는 시스템 검증이 아닙니다. 설정액은 실지급이 아닙니다.",
                  reason: "운영자 상품 등록 요청",
                });
              }}
            >
              실서버 저장 요청
            </button>
          </div>
          {preview ? (
            <pre className="ops-history" data-testid="catalog-preview-body" data-payout-complete="false">
              {preview}
            </pre>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <div className="panelhead">
          <div>
            <h2>아는 상품 수정·참여 조회</h2>
            <p>{COPY.catalogNoGet}</p>
          </div>
        </div>
        <div className="ops-form">
          <Field label="상품 번호" hint="단건 조회 API가 없어 목록에서 고른 번호나 이미 아는 UUID만 넣어요.">
            <input
              data-testid="catalog-known-id"
              value={knownId}
              onChange={(e) => {
                genRef.current += 1;
                setKnownId(e.target.value.trim());
                setRows(null);
              }}
            />
          </Field>
          <p className="ops-hint" data-testid="catalog-last-id">
            {lastProduct
              ? `마지막 저장 응답 ${lastProduct.id} · 버전 ${lastProduct.revision}`
              : "마지막 저장 응답 없음. 단건 조회로 채우지 않았어요."}
          </p>
          <div className="ops-actions">
            <button
              type="button"
              className="primary"
              data-testid="catalog-update"
              disabled={busy || !checked.ok || !isUuid(targetId)}
              onClick={() => {
                setPending(() => saveUpdate);
                setDraft({
                  title: "이 상품을 수정할까요?",
                  targetLabel: targetId,
                  currentLabel: expectedRevision != null ? `버전 ${expectedRevision}` : "버전 확인 불가",
                  nextLabel: checked.ok ? checked.data.name : "검증 실패",
                  impact: "단건 조회 없이 아는 번호로만 요청합니다. 409면 다시 확인하세요. 기존 참여 snapshot은 유지됩니다.",
                  reason: "운영자 상품 수정 요청",
                  approval: expectedRevision != null ? `expectedRevision ${expectedRevision}` : "버전 없음",
                });
              }}
            >
              수정 요청
            </button>
            <button
              type="button"
              data-testid="catalog-visibility-save"
              disabled={busy || !checked.ok || !isUuid(targetId)}
              onClick={() => {
                setPending(() => saveVisibility);
                setDraft({
                  title: "공개 범위를 바꿀까요?",
                  targetLabel: targetId,
                  currentLabel: lastProduct ? visibilityLabelKo(lastProduct.visibility) : "확인 불가",
                  nextLabel: checked.ok ? visibilityLabelKo(checked.data.visibility) : "검증 실패",
                  impact: "선택 공개는 권한이지 독점이 아닙니다. 기존 참여 기록은 지우지 않아요.",
                  reason: "운영자 공개 범위 변경",
                });
              }}
            >
              공개 범위 요청
            </button>
            <button
              type="button"
              data-testid="catalog-participations"
              disabled={busy || !isUuid(targetId)}
              onClick={() => void loadParticipations()}
            >
              참여·지급 조회
            </button>
            {origin.mode === "isolated-qa" && lastProduct && adapter.bumpProductRevision ? (
              <button
                type="button"
                data-testid="catalog-stale-revision"
                disabled={busy}
                onClick={() => {
                  const ok = adapter.bumpProductRevision?.(lastProduct.id);
                  notify(
                    ok
                      ? "격리 시험: 서버 버전만 올렸어요. 실제 운영 변경이 아닙니다."
                      : "격리 시험: 버전을 올리지 못했어요.",
                    false,
                  );
                }}
              >
                다른 직원 변경 가정
              </button>
            ) : null}
          </div>
          {rows ? (
            <div className="ops-history" data-testid="catalog-participation-list">
              <b>참여 조회</b>
              <p>{COPY.catalogSnapshot}</p>
              {rows.length === 0 ? <p>참여가 없거나 저장소가 비어 있어요. 지급 완료가 아닙니다.</p> : null}
              {rows.map((row) => (
                <p key={row.id} data-payout-complete={isPayoutComplete(row.moneyAuthority ?? null) ? "true" : "false"}>
                  {row.userId} · {row.id}
                  {row.snapshot?.payoutAmount ? ` · 당시 설정 ${row.snapshot.payoutAmount}` : ""}
                  {" · "}
                  {moneyDisplayLines(row.moneyAuthority ?? null).join(" / ")}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      </section>
      {draft ? (
        <ConfirmDialog
          draft={draft}
          busy={busy}
          close={() => (busy ? null : (setDraft(null), setPending(null)))}
          confirm={() => {
            if (busy || !pending) return;
            void pending();
          }}
        />
      ) : null}
    </>
  );
}
