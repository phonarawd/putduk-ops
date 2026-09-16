"use client";

import { useEffect, useState } from "react";
import { COPY } from "../../lib/admin/copy";
import { MEMBERSHIP_LABEL_KO } from "../../lib/admin/contract";
import type { AdminOpsPort, MemberDepositAddress, MemberProfile } from "../../lib/admin/types";
import { QrMark } from "./qr-mark";

export function MemberLiveExtras({ userId, adapter }: { userId: string; adapter: AdminOpsPort }) {
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [address, setAddress] = useState<MemberDepositAddress | null>(null);
  const [addressMissing, setAddressMissing] = useState(false);

  useEffect(() => {
    setProfile(null);
    setAddress(null);
    setAddressMissing(false);
    void adapter.getUserProfile(userId).then((res) => {
      if (res.ok) setProfile(res.data.item);
    });
    void adapter.getUserDepositAddress(userId).then((res) => {
      if (res.ok) {
        setAddress(res.data);
        setAddressMissing(false);
        return;
      }
      setAddressMissing(true);
    });
  }, [adapter, userId]);

  return (
    <>
      <section className="panel" data-testid="member-profile">
        <div className="panelhead">
          <div>
            <h2>회원 정보</h2>
            <p>서버가 준 가입 시각과 가입 IP만 보여 줍니다.</p>
          </div>
        </div>
        {profile ? (
          <dl className="detail-grid">
            <dt>가입 시각</dt>
            <dd data-testid="member-created-at">
              {profile.createdAt ? new Date(profile.createdAt).toLocaleString("ko-KR") : "없음"}
            </dd>
            <dt>가입 IP</dt>
            <dd data-testid="member-signup-ip">{profile.signupIp || "없음"}</dd>
            <dt>표시 이름</dt>
            <dd>{profile.profile?.displayName || profile.username || "없음"}</dd>
            <dt>상태</dt>
            <dd>{profile.status || "없음"}</dd>
            <dt>등급</dt>
            <dd>{profile.membership ? MEMBERSHIP_LABEL_KO[profile.membership] : "없음"}</dd>
            <dt>가린 이메일</dt>
            <dd>{profile.emailMasked || "없음"}</dd>
          </dl>
        ) : (
          <p className="ops-hint">회원 정보를 불러오는 중…</p>
        )}
      </section>
      <section className="panel">
        <div className="panelhead">
          <div>
            <h2>이 회원 USDT 주소</h2>
            <p>{COPY.memberUsdtHelp}</p>
          </div>
        </div>
        {address ? (
          <div className="ops-form">
            <QrMark payload={address.qrPayload || address.trc20Address} caption="이 회원 전용 TRC20" />
          </div>
        ) : addressMissing ? (
          <div className="empty-box">
            <b>아직 발급된 주소가 없어요</b>
            <p>여기서 새 주소를 만들지 않아요. 공유 주소도 보여 주지 않아요.</p>
          </div>
        ) : (
          <p className="ops-hint">주소를 확인하는 중…</p>
        )}
      </section>
    </>
  );
}
