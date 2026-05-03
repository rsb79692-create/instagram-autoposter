"use client";

import { useState, useEffect } from "react";
import styles from "./login.module.css";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ページに戻ってきたとき（bfcache）loading が固まるのを防ぐ
  useEffect(() => {
    const reset = () => setLoading(false);
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        // hard redirect でクッキーを確実に送信、history に /login を残さない
        window.location.replace("/dashboard");
        return;
      } else {
        const data = await res.json();
        setError(data.error ?? "ログイン失敗");
      }
    } catch {
      setError("通信エラーが発生しました");
    }
    setLoading(false);
  }

  return (
    <div className={styles.container}>
      <div className={styles.noise} />
      <div className={styles.orb} />

      <div className={styles.card}>
        <div className={styles.logo}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="10" fill="url(#grad)" />
            <circle cx="18" cy="18" r="8" stroke="white" strokeWidth="2.5" fill="none" />
            <circle cx="25.5" cy="10.5" r="2" fill="white" />
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="36" y2="36">
                <stop offset="0%" stopColor="#f09433" />
                <stop offset="25%" stopColor="#e6683c" />
                <stop offset="50%" stopColor="#dc2743" />
                <stop offset="75%" stopColor="#cc2366" />
                <stop offset="100%" stopColor="#bc1888" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <h1 className={styles.title}>Instagram Autoposter</h1>
        <p className={styles.sub}>管理者ログイン</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="••••••••••"
              autoFocus
              required
            />
          </div>

          {error && <p className={styles.error}>⚠ {error}</p>}

          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? (
              <span className={styles.spinner} />
            ) : (
              "ログイン"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
