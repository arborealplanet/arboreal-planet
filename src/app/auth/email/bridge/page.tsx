"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function EmailConfirmationBridgePage() {
  const params = useSearchParams();
  const [message, setMessage] = useState("Finishing email confirmation…");

  useEffect(() => {
    const nextValue = params.get("next") || "/profile";
    const next = nextValue.startsWith("/") && !nextValue.startsWith("//") ? nextValue : "/profile";
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    const expiresIn = Number(hash.get("expires_in") || "3600");
    const errorDescription = hash.get("error_description") || hash.get("error");

    if (errorDescription) {
      window.location.replace(`/login?authError=invalid_confirmation&next=${encodeURIComponent(next)}`);
      return;
    }

    if (!accessToken || !refreshToken) {
      setMessage("That confirmation link is invalid or expired. Redirecting…");
      window.setTimeout(() => {
        window.location.replace(`/login?authError=invalid_confirmation&next=${encodeURIComponent(next)}`);
      }, 900);
      return;
    }

    fetch("/api/auth/email/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, refreshToken, expiresIn }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("confirmation failed");
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        window.location.replace(next);
      })
      .catch(() => {
        setMessage("We could not finish that confirmation. Redirecting…");
        window.setTimeout(() => {
          window.location.replace(`/login?authError=invalid_confirmation&next=${encodeURIComponent(next)}`);
        }, 900);
      });
  }, [params]);

  return (
    <main className="mx-auto max-w-xl px-5 py-20 sm:px-6">
      <div className="panel rounded-[30px] p-8 text-center">
        <div className="section-kicker">Arboreal Planet</div>
        <h1 className="mt-3 text-2xl font-semibold">Confirming your account</h1>
        <p className="mt-3 text-sm text-white/40">{message}</p>
      </div>
    </main>
  );
}
