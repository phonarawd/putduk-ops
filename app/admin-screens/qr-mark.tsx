"use client";

import { useEffect, useState } from "react";

export function QrMark({ payload, caption }: { payload: string; caption: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let stop = false;
    void import("qrcode")
      .then((mod) => {
        const QR = (mod as { default?: { toDataURL: typeof import("qrcode").toDataURL } }).default ?? mod;
        return QR.toDataURL(payload, { width: 196, margin: 1, errorCorrectionLevel: "M" });
      })
      .then((url) => {
        if (!stop) setSrc(url);
      })
      .catch(() => {
        if (!stop) setSrc("");
      });
    return () => {
      stop = true;
    };
  }, [payload]);
  return (
    <figure className="qr-mark" data-testid="member-usdt-qr">
      {src ? <img src={src} alt="" width={196} height={196} /> : <div className="qr-mark-wait">주소 그림 준비 중…</div>}
      <figcaption>
        <b>{caption}</b>
        <code data-testid="member-usdt-address">{payload}</code>
      </figcaption>
    </figure>
  );
}
