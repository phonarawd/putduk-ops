"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, ChevronRight, PackagePlus } from "lucide-react";
import {
  type ApiFailure,
  type DirectoryMember,
  type OperatorProduct,
  type ParticipationRow,
  type Visibility,
  VISIBILITY_LABEL,
  formatApiFailure,
  getOperatorProduct,
  isOpsApiError,
  listOperatorProducts,
  listParticipations,
  mintIdempotencyKey,
  nextActionForFailure,
  patchOperatorProduct,
  patchOperatorVisibility,
  registerOperatorProduct,
  searchMembers,
} from "@/lib/ops-backend";

function Badge({
  tone = "gray",
  children,
}: {
  tone?: "green" | "amber" | "red" | "blue" | "gray";
  children: React.ReactNode;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function visibilityTone(value: string): "green" | "amber" | "red" | "gray" {
  if (value === "all_public") return "green";
  if (value === "selected_members") return "amber";
  if (value === "private") return "red";
  return "gray";
}

function ErrorPanel({ failure }: { failure: ApiFailure }) {
  return (
    <div className="ops-error" role="alert">
      <AlertTriangle />
      <div>
        <b>서버가 요청을 반영하지 않았습니다.</b>
        <p>{nextActionForFailure(failure)}</p>
        <code>{formatApiFailure(failure)}</code>
      </div>
    </div>
  );
}

function captureError(error: unknown): ApiFailure {
  if (isOpsApiError(error)) return error.failure;
  return {
    http: 0,
    code: "CLIENT_ERROR",
    message: error instanceof Error ? error.message : "알 수 없는 오류",
    body: null,
  };
}

function parseMemberIds(text: string): string[] {
  return text
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function OperatorProductsPanel({
  route,
  notify,
}: {
  route: string;
  notify: (message: string) => void;
}) {
  if (route === "/products/new") return <ProductCreate notify={notify} />;
  if (route.startsWith("/products/") && route !== "/products") {
    return <ProductDetail id={decodeURIComponent(route.split("/").pop() || "")} notify={notify} />;
  }
  return <ProductList />;
}

function ProductList() {
  const [items, setItems] = useState<OperatorProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [filter, setFilter] = useState("전체");

  useEffect(() => {
    let cancelled = false;
    listOperatorProducts({
      limit: 50,
      visibility: filter === "전체" ? undefined : filter,
    })
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setFailure(null);
      })
      .catch((error) => {
        if (cancelled) return;
        setItems([]);
        setFailure(captureError(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filter]);

  return (
    <>
      <div className="ops-note">
        <PackagePlus />
        <div>
          <b>운영자가 등록한 퍼뜩 상품만 다룹니다.</b>
          <p>
            eBay·Amazon 수집 목록을 여기서 고치지 않습니다. 회원 앱에 나가는 상품은 이 화면에서 등록한
            것만입니다.
          </p>
        </div>
      </div>
      {failure && <ErrorPanel failure={failure} />}
      <section className="panel">
        <div className="tools">
          <div className="pills">
            {["전체", "all_public", "selected_members", "private"].map((value) => (
              <button
                className={filter === value ? "on" : ""}
                key={value}
                onClick={() => {
                  setFilter(value);
                  setLoading(true);
                }}
              >
                {value === "전체" ? "전체" : VISIBILITY_LABEL[value] || value}
              </button>
            ))}
          </div>
          <Link className="primary" href="/products/new">
            새 상품 등록
          </Link>
        </div>
        {loading ? (
          <p className="ops-empty">상품 목록을 불러오는 중…</p>
        ) : !failure && items.length === 0 ? (
          <p className="ops-empty">아직 등록된 운영 상품이 없습니다.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>상품</th>
                  <th>지급 금액</th>
                  <th>공개 범위</th>
                  <th>수정 번호</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <b>{item.name || "(이름 없음)"}</b>
                      <div className="ops-id">{item.id}</div>
                    </td>
                    <td>
                      {item.payoutAmount || item.configuredPayoutUsdt || "—"} {item.currency}
                    </td>
                    <td>
                      <Badge tone={visibilityTone(item.visibility)}>
                        {VISIBILITY_LABEL[item.visibility] || item.visibility || "—"}
                      </Badge>
                    </td>
                    <td>{item.revision ?? "—"}</td>
                    <td>
                      <Link className="textbtn" href={`/products/${item.id}`}>
                        자세히 보기
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function ProductCreate({ notify }: { notify: (message: string) => void }) {
  const [name, setName] = useState("");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [compositionQty, setCompositionQty] = useState("1");
  const [visibility, setVisibility] = useState<Visibility>("all_public");
  const [memberText, setMemberText] = useState("");
  const [memo, setMemo] = useState("");
  const [idempotencyKey] = useState(() => mintIdempotencyKey());
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [created, setCreated] = useState<OperatorProduct | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !payoutAmount.trim()) {
      setFailure({
        http: 0,
        code: "VALIDATION",
        message: "상품 이름과 지급 금액을 모두 입력해 주세요.",
        body: null,
      });
      return;
    }
    if (visibility === "selected_members" && parseMemberIds(memberText).length === 0) {
      setFailure({
        http: 0,
        code: "VALIDATION",
        message: "지정 회원 공개는 회원 번호를 한 명 이상 넣어 주세요.",
        body: null,
      });
      return;
    }
    setBusy(true);
    setFailure(null);
    try {
      const product = await registerOperatorProduct({
        name: name.trim(),
        compositionQty: Number(compositionQty) || 1,
        payoutAmount: payoutAmount.trim(),
        visibility,
        selectedMemberIds: parseMemberIds(memberText),
        priceConfirmationMemo: memo.trim() || undefined,
        idempotencyKey,
      });
      setCreated(product);
      notify(
        product.applied === false
          ? "같은 요청이 이미 등록되어 있어요. 기존 상품을 열었습니다."
          : "상품을 등록했어요.",
      );
    } catch (error) {
      setFailure(captureError(error));
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    return (
      <section className="panel ops-form">
        <div className="panelhead">
          <div>
            <h2>등록한 상품</h2>
            <p>방금 값이 서버에 남아 있는지 상세에서 확인해 주세요.</p>
          </div>
        </div>
        <dl className="detail-grid">
          <dt>이름</dt>
          <dd>{created.name}</dd>
          <dt>지급 금액</dt>
          <dd>
            {created.payoutAmount || created.configuredPayoutUsdt} {created.currency}
          </dd>
          <dt>공개 범위</dt>
          <dd>{VISIBILITY_LABEL[created.visibility] || created.visibility}</dd>
          <dt>수정 번호</dt>
          <dd>{created.revision ?? "—"}</dd>
        </dl>
        <div className="ops-form-actions">
          <Link className="primary" href={`/products/${created.id}`}>
            상세에서 이어서 수정
          </Link>
          <Link href="/products">목록으로</Link>
        </div>
      </section>
    );
  }

  return (
    <form className="panel ops-form" onSubmit={submit}>
      <div className="panelhead">
        <div>
          <h2>새 퍼뜩 상품</h2>
          <p>등록하면 회원 앱에 이 상품이 나갑니다. 외부 수집 상품이 아닙니다.</p>
        </div>
      </div>
      {failure && <ErrorPanel failure={failure} />}
      <ProductFields
        name={name}
        setName={setName}
        payoutAmount={payoutAmount}
        setPayoutAmount={setPayoutAmount}
        compositionQty={compositionQty}
        setCompositionQty={setCompositionQty}
        visibility={visibility}
        setVisibility={setVisibility}
        memberText={memberText}
        setMemberText={setMemberText}
        memo={memo}
        setMemo={setMemo}
      />
      <div className="ops-form-actions">
        <button className="primary" disabled={busy}>
          {busy ? "등록하는 중…" : "공개 상품으로 등록"}
        </button>
        <Link href="/products">취소</Link>
      </div>
    </form>
  );
}

function ProductDetail({
  id,
  notify,
}: {
  id: string;
  notify: (message: string) => void;
}) {
  const [product, setProduct] = useState<OperatorProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [conflictNote, setConflictNote] = useState("");
  const [name, setName] = useState("");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [compositionQty, setCompositionQty] = useState("1");
  const [visibility, setVisibility] = useState<Visibility>("all_public");
  const [memberText, setMemberText] = useState("");
  const [memo, setMemo] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [participations, setParticipations] = useState<ParticipationRow[]>([]);
  const [participationFailure, setParticipationFailure] = useState<ApiFailure | null>(null);

  const applyProduct = (next: OperatorProduct) => {
    setProduct(next);
    setName(next.name);
    setPayoutAmount(next.payoutAmount || next.configuredPayoutUsdt);
    setCompositionQty(String(next.compositionQty ?? 1));
    setVisibility((next.visibility as Visibility) || "all_public");
    setMemberText(next.selectedMemberIds.join("\n"));
    setMemo(next.priceConfirmationMemo);
  };

  const reload = async (opts?: { silent?: boolean }) => {
    const next = await getOperatorProduct(id);
    applyProduct(next);
    if (!opts?.silent) setFailure(null);
    return next;
  };

  useEffect(() => {
    let cancelled = false;
    getOperatorProduct(id)
      .then((next) => {
        if (!cancelled) applyProduct(next);
      })
      .catch((error) => {
        if (!cancelled) setFailure(captureError(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    listParticipations(id)
      .then((result) => {
        if (cancelled) return;
        setParticipations(result.items);
        setParticipationFailure(result.unavailable ?? null);
      })
      .catch((error) => {
        if (!cancelled) setParticipationFailure(captureError(error));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const savePrice = async () => {
    if (!product || product.revision == null) {
      setFailure({
        http: 0,
        code: "REVISION_REQUIRED",
        message: "수정 번호가 없어 저장하지 않습니다.",
        body: null,
      });
      return;
    }
    setSavingPrice(true);
    setFailure(null);
    setConflictNote("");
    try {
      const next = await patchOperatorProduct(product.id, {
        expectedRevision: product.revision,
        name: name.trim(),
        payoutAmount: payoutAmount.trim(),
        compositionQty: Number(compositionQty) || 1,
        priceConfirmationMemo: memo.trim(),
      });
      applyProduct(next);
      notify("가격과 이름을 저장했어요.");
    } catch (error) {
      const caught = captureError(error);
      if (caught.http === 409 || caught.code === "REVISION_CONFLICT") {
        const latest = await reload({ silent: true });
        setConflictNote(
          `409 · ${caught.code}. 최신 수정 번호 ${latest.revision ?? "—"}로 화면을 갱신했습니다. 값을 확인한 뒤 다시 저장해 주세요.`,
        );
        setFailure(caught);
      } else {
        setFailure(caught);
      }
    } finally {
      setSavingPrice(false);
    }
  };

  const saveVisibility = async () => {
    if (!product || product.revision == null) {
      setFailure({
        http: 0,
        code: "REVISION_REQUIRED",
        message: "수정 번호가 없어 공개 범위를 바꾸지 않습니다.",
        body: null,
      });
      return;
    }
    if (visibility === "selected_members" && parseMemberIds(memberText).length === 0) {
      setFailure({
        http: 0,
        code: "VALIDATION",
        message: "지정 회원 공개는 회원 번호를 한 명 이상 넣어 주세요.",
        body: null,
      });
      return;
    }
    setSavingVisibility(true);
    setFailure(null);
    setConflictNote("");
    try {
      const next = await patchOperatorVisibility(product.id, {
        expectedRevision: product.revision,
        visibility,
        selectedMemberIds: parseMemberIds(memberText),
      });
      applyProduct(next);
      notify("공개 범위를 저장했어요.");
    } catch (error) {
      const caught = captureError(error);
      if (caught.http === 409 || caught.code === "REVISION_CONFLICT") {
        const latest = await reload({ silent: true });
        setConflictNote(
          `409 · ${caught.code}. 최신 수정 번호 ${latest.revision ?? "—"}로 화면을 갱신했습니다. 값을 확인한 뒤 다시 저장해 주세요.`,
        );
        setFailure(caught);
      } else {
        setFailure(caught);
      }
    } finally {
      setSavingVisibility(false);
    }
  };

  if (loading) return <p className="ops-empty">상품을 불러오는 중…</p>;
  if (!product && failure) return <ErrorPanel failure={failure} />;
  if (!product) return <p className="ops-empty">상품을 찾을 수 없습니다.</p>;

  return (
    <>
      <section className="profile">
        <span className="bigavatar">상</span>
        <div>
          <span className="inline">
            <h2>{product.name || "이름 없는 상품"}</h2>
            <Badge tone={visibilityTone(product.visibility)}>
              {VISIBILITY_LABEL[product.visibility] || product.visibility || "공개 범위 없음"}
            </Badge>
          </span>
          <p>
            상품 번호 {product.id} · 수정 번호 {product.revision ?? "없음"} · 지급{" "}
            {product.payoutAmount || product.configuredPayoutUsdt || "—"} {product.currency}
          </p>
        </div>
        <Link className="textbtn" href="/products">
          목록으로
        </Link>
      </section>
      {failure && <ErrorPanel failure={failure} />}
      {conflictNote && <p className="ops-conflict">{conflictNote}</p>}
      <div className="twocol">
        <section className="panel ops-form">
          <div className="panelhead">
            <div>
              <h2>이름·가격</h2>
              <p>지급 금액은 서버 값 payoutAmount / configured_payout_usdt 를 그대로 씁니다.</p>
            </div>
          </div>
          <label>
            <span>상품 이름</span>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            <span>지급 금액 (USDT)</span>
            <input
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value)}
              inputMode="decimal"
            />
          </label>
          <label>
            <span>묶음 개수</span>
            <input value={compositionQty} onChange={(e) => setCompositionQty(e.target.value)} />
          </label>
          <label>
            <span>금액 확인 메모</span>
            <textarea value={memo} onChange={(e) => setMemo(e.target.value)} />
          </label>
          <div className="ops-form-actions">
            <button className="primary" type="button" disabled={savingPrice} onClick={savePrice}>
              {savingPrice ? "저장하는 중…" : "가격 저장"}
            </button>
          </div>
        </section>
        <section className="panel ops-form">
          <div className="panelhead">
            <div>
              <h2>누가 보게 할까요</h2>
              <p>지정 회원은 독점 예약이 아닙니다. 지정된 여러 회원이 함께 참여할 수 있습니다.</p>
            </div>
          </div>
          <VisibilityFields
            visibility={visibility}
            setVisibility={setVisibility}
            memberText={memberText}
            setMemberText={setMemberText}
          />
          <div className="ops-form-actions">
            <button
              className="primary"
              type="button"
              disabled={savingVisibility}
              onClick={saveVisibility}
            >
              {savingVisibility ? "저장하는 중…" : "공개 범위 저장"}
            </button>
          </div>
        </section>
      </div>
      <section className="panel" style={{ marginTop: 18 }}>
        <div className="panelhead">
          <div>
            <h2>참여 목록</h2>
            <p>있으면 서버 목록을 그대로 보여 줍니다. 없으면 없다고 알려 줍니다.</p>
          </div>
        </div>
        {participationFailure && <ErrorPanel failure={participationFailure} />}
        {!participationFailure && participations.length === 0 ? (
          <p className="ops-empty">참여 기록이 없습니다.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>참여</th>
                  <th>회원</th>
                  <th>상태</th>
                  <th>지급 스냅샷</th>
                </tr>
              </thead>
              <tbody>
                {participations.map((row, index) => (
                  <tr key={row.id || `${row.userId}-${index}`}>
                    <td>{row.id || "—"}</td>
                    <td>{row.userId || "—"}</td>
                    <td>{row.status || "—"}</td>
                    <td>{row.configuredPayoutUsdt || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function ProductFields(props: {
  name: string;
  setName: (v: string) => void;
  payoutAmount: string;
  setPayoutAmount: (v: string) => void;
  compositionQty: string;
  setCompositionQty: (v: string) => void;
  visibility: Visibility;
  setVisibility: (v: Visibility) => void;
  memberText: string;
  setMemberText: (v: string) => void;
  memo: string;
  setMemo: (v: string) => void;
}) {
  return (
    <div className="ops-fields">
      <label>
        <span>상품 이름</span>
        <input
          value={props.name}
          onChange={(e) => props.setName(e.target.value)}
          placeholder="회원 앱에 보일 이름"
        />
      </label>
      <label>
        <span>지급 금액 (USDT)</span>
        <input
          value={props.payoutAmount}
          onChange={(e) => props.setPayoutAmount(e.target.value)}
          inputMode="decimal"
          placeholder="예: 12.5"
        />
      </label>
      <label>
        <span>묶음 개수</span>
        <input
          value={props.compositionQty}
          onChange={(e) => props.setCompositionQty(e.target.value)}
        />
      </label>
      <label>
        <span>금액 확인 메모 (내부)</span>
        <textarea
          value={props.memo}
          onChange={(e) => props.setMemo(e.target.value)}
          placeholder="회원에게는 보이지 않아요."
        />
      </label>
      <VisibilityFields
        visibility={props.visibility}
        setVisibility={props.setVisibility}
        memberText={props.memberText}
        setMemberText={props.setMemberText}
      />
    </div>
  );
}

function VisibilityFields({
  visibility,
  setVisibility,
  memberText,
  setMemberText,
}: {
  visibility: Visibility;
  setVisibility: (v: Visibility) => void;
  memberText: string;
  setMemberText: (v: string) => void;
}) {
  return (
    <>
      <div className="ops-vis">
        {(
          [
            ["all_public", "모든 회원에게 보이기"],
            ["selected_members", "지정한 회원만"],
            ["private", "비공개"],
          ] as const
        ).map(([value, label]) => (
          <label key={value}>
            <input
              type="radio"
              name="visibility"
              checked={visibility === value}
              onChange={() => setVisibility(value)}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
      {visibility === "selected_members" && (
        <MemberPicker value={memberText} onChange={setMemberText} />
      )}
    </>
  );
}

function MemberPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<DirectoryMember[]>([]);
  const [unavailable, setUnavailable] = useState<ApiFailure | null>(null);
  const selected = useMemo(() => new Set(parseMemberIds(value)), [value]);

  const lookup = async () => {
    const result = await searchMembers(q);
    setHits(result.items);
    setUnavailable(result.unavailable ?? null);
  };

  const toggle = (userId: string) => {
    const next = new Set(selected);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    onChange([...next].join("\n"));
  };

  return (
    <div className="ops-members">
      <label>
        <span>지정할 회원 번호</span>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="회원 UUID를 한 줄에 하나씩 넣거나, 아래에서 찾아 고르세요."
        />
      </label>
      <div className="ops-member-search">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="회원 번호(UUID)로 찾기"
        />
        <button type="button" onClick={lookup}>
          회원 찾기
        </button>
      </div>
      {unavailable && <ErrorPanel failure={unavailable} />}
      {hits.length > 0 && (
        <ul>
          {hits.map((member) => (
            <li key={member.userId}>
              <button type="button" onClick={() => toggle(member.userId)}>
                <Check />
                <span>
                  <b>{member.userId}</b>
                  <small>
                    {member.resellerId ? `초대코드 ${member.resellerId}` : "초대코드 없음"}
                    {member.membership ? ` · ${member.membership}` : ""}
                  </small>
                </span>
                <ChevronRight />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
