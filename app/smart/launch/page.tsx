"use client";
import { useEffect } from "react";

export default function SmartLaunchPage() {
  useEffect(() => {
    (async () => {
      const FHIR = (await import("fhirclient")).default;

      const url = new URL(window.location.href);
      const iss = url.searchParams.get("iss") || undefined;
      const launch = url.searchParams.get("launch") || undefined;
      /**
       * GitHub Project Pages 的 URL 會是:
       *   https://<user>.github.io/<repo>/...
       * window.location.origin 只有 https://<user>.github.io
       * 所以 redirectUri 一定要把 <repo> 這段補回去。
       *
       * 最穩的方式：從目前 pathname 取第一段當 repoBase
       * 例：/Sepsis_prediction_smartonfhir/smart/launch/  -> repoBase=/Sepsis_prediction_smartonfhir
       *
       * 本機開發通常是 /smart/launch/...（第一段就是 smart），這時 repoBase 應該是空字串。
       */
      const firstSeg = window.location.pathname.split("/")[1]; // e.g. "Sepsis_prediction_smartonfhir" or "smart"
      const repoBase = firstSeg && firstSeg !== "smart" ? `/${firstSeg}` : "";

      const baseUrl = `${window.location.origin}${repoBase}`.replace(/\/+$/, "");
      const redirectUri = `${baseUrl}/smart/callback/`; // 建議保留尾斜線（配合 trailingSlash: true）

      console.log("[SMART] href=", window.location.href);
      console.log("[SMART] pathname=", window.location.pathname);
      console.log("[SMART] repoBase=", repoBase);
      console.log("[SMART] baseUrl=", baseUrl, "redirectUri=", redirectUri);

      await FHIR.oauth2.authorize({
        clientId: "my_web_app",
        scope: "launch openid fhirUser patient/*.read online_access",
        redirectUri,
        iss,
        launch,
        completeInTarget: true,
      });
    })();
  }, []);

  return <p className="p-6 text-sm text-muted-foreground">Launching SMART…</p>;
}
