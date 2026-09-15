/**
 * 승인된 localhost 격리 Nest·DB가 있을 때만 연결할 게이트.
 * 기본은 BLOCKED. 운영 host·실회원·실지급을 호출하지 않는다.
 * 백엔드 계약에 없는 이름을 확정 env처럼 쓰지 않는다.
 */
import { assertNoProdHost, isLoopbackHostname } from "./allowlist.mjs";

function env(name) {
  const value = process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

const allow = env("PUTDUK_OPS_ALLOW_LOCAL_NEST") === "1";
const run = env("PUTDUK_OPS_RUN_LOCAL_NEST") === "1";
const apiOrigin = env("PUTDUK_ADMIN_API_ORIGIN") || env("NEXT_PUBLIC_PUTDUK_ADMIN_API_ORIGIN");
const catalogTest = env("CATALOG_TEST_DATABASE_URL");

console.log("conditional-live-integration 게이트 확인. 실서버 PASS가 아닙니다.");
console.log(
  JSON.stringify(
    {
      allowLocalNest: allow,
      runLocalNest: run,
      hasAdminApiOrigin: Boolean(apiOrigin),
      hasCatalogTestDatabaseUrl: Boolean(catalogTest),
      note: {
        PUTDUK_OPS_ALLOW_LOCAL_NEST: "OPS 실행 스위치. 백엔드 계약 env가 아님",
        PUTDUK_OPS_RUN_LOCAL_NEST: "OPS 실행 스위치. 백엔드 계약 env가 아님",
        PUTDUK_ADMIN_API_ORIGIN: "OPS가 이미 쓰는 API origin. 추측 금지",
        CATALOG_TEST_DATABASE_URL: "백엔드 persist 계약 이름. 값이 있어도 이 스크립트가 DB에 붙지 않음",
        DATABASE_URL: "mall persist에 쓰지 않음. 이 스크립트가 읽지 않음",
      },
    },
    null,
    2,
  ),
);

if (apiOrigin) {
  let url;
  try {
    url = new URL(apiOrigin);
  } catch {
    console.error("PUTDUK_ADMIN_API_ORIGIN 형식이 올바르지 않습니다. 연결하지 않습니다.");
    process.exit(1);
  }
  try {
    assertNoProdHost(url);
  } catch (err) {
    console.error(String(err && err.message ? err.message : err));
    process.exit(1);
  }
  if (!isLoopbackHostname(url.hostname)) {
    console.error("루프백이 아닌 API origin은 연결하지 않습니다.");
    process.exit(1);
  }
}

if (!allow || !run || !apiOrigin) {
  console.log(
    "BLOCKED: 승인된 localhost 격리 Nest 실행 권한이 확인되지 않았습니다. HTTP/DB 호출 0. 이 종료는 게이트 확인이며 실통합 PASS가 아닙니다.",
  );
  process.exit(0);
}

console.error(
  "실행 스위치가 켜져 있어도 이 세션의 기본 절차는 준비만 합니다. 실제 GET/POST는 별도 Human ACK 후에만 합니다. 호출 0.",
);
process.exit(2);
