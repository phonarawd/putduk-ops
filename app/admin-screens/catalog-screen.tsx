"use client";

import { useEffect, useRef, useState } from "react";
import { COPY } from "../../lib/admin/copy";
import { PRODUCT_VISIBILITY, isUuid, type ProductVisibility } from "../../lib/admin/contract";
import { formatUsdt, formatWon } from "../../lib/admin/labels";
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
  expectedProfitKrwApprox: "",
  requiredCapitalUsdt: "",
  visibility: "all_public" as ProductVisibility,
  selectedMemberIds: "",
  operatorMemo: "",
};

function formFromProduct(product: OperatorProduct) {
  return {
    name: product.name,
    description: product.description,
    photos: product.photos.join("\n"),
    compositionQty: String(product.compositionQty),
    payoutAmount: product.payoutAmount,
    expectedProfitKrwApprox: product.expectedProfitKrwApprox ?? "",
    requiredCapitalUsdt: product.requiredCapitalUsdt,
    visibility: product.visibility,
    selectedMemberIds: product.selectedMemberIds.join("\n"),
    operatorMemo: product.priceConfirmationMemo,
  };
}

function previewLines(persist: ReturnType<typeof persistBodyFromDraft>, incoming?: unknown) {
  return [
    `이름: ${persist.name}`,
    `구성 수량: ${persist.compositionQty} · 판매 재고 아님`,
    `공개: ${visibilityLabelKo(persist.visibility)}`,
    persist.visibility === "selected_members"
      ? `선택 회원 ${persist.selectedMemberIds.length}명 · 여러 회원이 같이 참여할 수 있어요`
      : "조건 충족 회원이 동시에 참여할 수 있음",
    persist.description ? `설명: ${persist.description}` : "설명 없음",
    persist.photos.length ? `사진 ${persist.photos.length}장` : "사진 없음",
    `정산 USDT: ${persist.payoutAmount}`,
    persist.expectedProfitKrwApprox ? `표시 원: ${persist.expectedProfitKrwApprox}` : "표시 원: 없음 (보내지 않음)",
    `필요자본 USDT: ${persist.requiredCapitalUsdt}`,
    ...productMoneyLines(persist, incoming),
    persist.priceConfirmationMemo ? `운영 메모: ${persist.priceConfirmationMemo}` : "운영 메모 없음",
    "이 메모는 가격이 맞다는 확인이 아닙니다.",
    COPY.catalogResellerHidden,
  ].join("\n");
}

function firstPhoto(product: OperatorProduct): string | null {
  const raw = product.photos.find((item) => typeof item === "string" && item.trim());
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol === "https:" || url.protocol === "http:") return url.toString();
  } catch {
    return null;
  }
  return null;
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
    expectedProfitKrwApprox: form.expectedProfitKrwApprox,
    requiredCapitalUsdt: form.requiredCapitalUsdt,
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
    const gen = ++genRef.current;
    setForm(formFromProduct(product));
    setPreview("");
    setError(null);
    setDraft(null);
    setPending(null);
    setKnownId(product.id);
    setLastProduct(product);
    setRows(null);
    setView("form");
    void adapter.getProduct(product.id).then((res) => {
      if (gen !== genRef.current || !res.ok) return;
      setForm(formFromProduct(res.data));
      setLastProduct(res.data);
    });
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
    setPreview(previewLines(persist));
  };

  const applyProduct = (product: OperatorProduct, gen: number) => {
    if (gen !== genRef.current) return;
    setLastProduct(product);
    setKnownId(product.id);
    setPreview(previewLines(product, product));
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
              <p>이름·정산 USDT·표시 원·필요자본·공개 범위만 보여 줍니다.</p>
            </div>
            <button type="button" className="primary" data-testid="catalog-register" onClick={openRegister}>
              상품 등록
            </button>
          </div>
          {listBusy ? <p className="ops-hint">{COPY.catalogListLoading}</p> : null}
          {!listBusy && listError ? (
            <div className="empty-box">
              <b>목록을 불러오지 못했어요</b>
              <p>{COPY.catalogListUnavailable}</p>
            </div>
          ) : null}
          {!listBusy && !listError && listItems.length === 0 ? (
            <div className="empty-box" data-testid="catalog-list-empty">
              <b>아직 등록된 상품이 없어요</b>
              <p>오른쪽 위 「상품 등록」을 눌러 첫 상품을 만들어 주세요.</p>
            </div>
          ) : null}
          {!listBusy && listItems.length > 0 ? (
            <div className="product-list">
              {listItems.map((product) => {
                const photo = firstPhoto(product);
                return (
                  <button
                    key={product.id}
                    type="button"
                    className="product-card"
                    data-testid="catalog-product-row"
                    data-product-id={product.id}
                    onClick={() => openEdit(product)}
                  >
                    <span className="product-photo">
                      {photo ? <img src={photo} alt="" /> : "사진 없음"}
                    </span>
                    <span className="product-main">
                      <b className="product-name">{product.name}</b>
                      <span className="product-vis">{visibilityLabelKo(product.visibility)}</span>
                    </span>
                    <span className="product-money">
                      <span>
                        <small>정산 USDT</small>
                        <b>{formatUsdt(product.payoutAmount)}</b>
                      </span>
                      <span>
                        <small>표시 원</small>
                        <b>{formatWon(product.expectedProfitKrwApprox)}</b>
                      </span>
                      <span>
                        <small>필요자본 USDT</small>
                        <b>{formatUsdt(product.requiredCapitalUsdt)}</b>
                      </span>
                    </span>
                  </button>
                );
              })}
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
      <ResultBanner result={error} />
      <div className="ops-actions" style={{ marginBottom: 12 }}>
        <button type="button" data-testid="catalog-back-to-list" disabled={busy} onClick={backToList}>
          목록으로
        </button>
      </div>
      <section className="panel">
        <div className="panelhead">
          <div>
            <h2>{lastProduct ? "상품 수정" : "새 상품 등록"}</h2>
            <p>이름과 세 가지 금액, 공개 범위만 확인하면 됩니다.</p>
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
          <Field label="사진 주소" hint="한 줄에 주소 하나. 없어도 됩니다.">
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
          <Field label="정산 USDT" hint={COPY.catalogPayoutHint}>
            <input
              data-testid="catalog-payout"
              value={form.payoutAmount}
              onChange={(e) => setForm({ ...form, payoutAmount: e.target.value })}
            />
          </Field>
          <Field label="표시 원" hint={COPY.catalogKrwHint}>
            <input
              data-testid="catalog-krw"
              value={form.expectedProfitKrwApprox}
              onChange={(e) => setForm({ ...form, expectedProfitKrwApprox: e.target.value })}
            />
          </Field>
          <Field label="필요자본 USDT" hint={COPY.catalogCapitalHint}>
            <input
              data-testid="catalog-capital"
              value={form.requiredCapitalUsdt}
              onChange={(e) => setForm({ ...form, requiredCapitalUsdt: e.target.value })}
            />
          </Field>
          <Field label="공개 범위" hint="기본은 모든 회원에게 공개입니다. 선택 공개여도 여러 회원이 함께 참여할 수 있어요.">
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
            <Field label="선택 회원 번호" hint="회원 번호를 쉼표나 줄로 구분하세요. 여러 회원이 같은 상품에 함께 참여할 수 있어요.">
              <textarea
                data-testid="catalog-members"
                value={form.selectedMemberIds}
                onChange={(e) => setForm({ ...form, selectedMemberIds: e.target.value })}
              />
            </Field>
          ) : null}
          <Field label="운영 메모" hint={COPY.catalogMemoHint}>
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
                  title: "이 상품을 등록할까요?",
                  targetLabel: checked.ok ? checked.data.name : form.name,
                  currentLabel: "저장 전",
                  nextLabel: checked.ok
                    ? `${visibilityLabelKo(checked.data.visibility)} · 정산 ${checked.data.payoutAmount} USDT`
                    : "확인 필요",
                  impact: "저장이 준비되지 않으면 등록되지 않아요. 이 금액은 아직 지급 완료가 아닙니다.",
                  reason: "운영자 상품 등록",
                });
              }}
            >
              상품 등록
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
            <h2>저장한 상품 고치기</h2>
            <p>{COPY.catalogNoGet}</p>
          </div>
        </div>
        <div className="ops-form">
          <Field label="상품 번호" hint="목록에서 고른 상품이면 자동으로 채워집니다.">
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
              ? `마지막 저장 응답 ${lastProduct.id} · 저장 번호 ${lastProduct.revision}`
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
                  targetLabel: lastProduct?.name || "선택한 상품",
                  currentLabel: expectedRevision != null ? `저장 번호 ${expectedRevision}` : "저장 번호 확인 불가",
                  nextLabel: checked.ok ? checked.data.name : "확인 필요",
                  impact: "이미 참여한 건의 금액은 그대로 둡니다. 다른 직원이 먼저 바꿨으면 다시 불러 주세요.",
                  reason: "운영자 상품 수정",
                });
              }}
            >
              수정하기
            </button>
            <button
              type="button"
              data-testid="catalog-visibility-save"
              disabled={busy || !checked.ok || !isUuid(targetId)}
              onClick={() => {
                setPending(() => saveVisibility);
                setDraft({
                  title: "공개 범위를 바꿀까요?",
                  targetLabel: lastProduct?.name || "선택한 상품",
                  currentLabel: lastProduct ? visibilityLabelKo(lastProduct.visibility) : "확인 불가",
                  nextLabel: checked.ok ? visibilityLabelKo(checked.data.visibility) : "확인 필요",
                  impact: "선택 공개여도 여러 회원이 함께 참여할 수 있어요. 이미 참여한 기록은 지우지 않아요.",
                  reason: "운영자 공개 범위 변경",
                });
              }}
            >
              공개 범위 바꾸기
            </button>
            <button
              type="button"
              data-testid="catalog-participations"
              disabled={busy || !isUuid(targetId)}
              onClick={() => void loadParticipations()}
            >
              참여·지급 보기
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
                      ? "연습: 다른 직원이 먼저 바꾼 상황을 만들었어요. 실제 운영 변경이 아닙니다."
                      : "연습: 상황을 만들지 못했어요.",
                    false,
                  );
                }}
              >
                다른 직원이 먼저 바꾼 상황
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
                  회원 {row.userId}
                  {row.snapshot?.payoutAmount ? ` · 당시 정산 ${row.snapshot.payoutAmount} USDT` : ""}
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
