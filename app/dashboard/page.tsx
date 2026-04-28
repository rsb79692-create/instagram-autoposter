"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import styles from "./dashboard.module.css";

type Step = "upload" | "generating" | "preview" | "posting" | "done";

interface GeneratedContent {
  caption: string;
  hashtags: string[];
}

interface PostResult {
  postId: string;
  permalink: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");
  const [uploadedFilePath, setUploadedFilePath] = useState<string>("");
  const [generated, setGenerated] = useState<GeneratedContent | null>(null);
  const [editedCaption, setEditedCaption] = useState("");
  const [editedHashtags, setEditedHashtags] = useState("");
  const [result, setResult] = useState<PostResult | null>(null);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // ログアウト
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  // ファイル選択処理
  function handleFileSelect(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("画像ファイルを選択してください");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("ファイルサイズは8MB以下にしてください");
      return;
    }
    setError("");
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  // ドラッグ&ドロップ
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Step 1: アップロード → AI生成
  async function handleUploadAndGenerate() {
    if (!imageFile) return;
    setError("");
    setStep("generating");

    try {
      // 1. Supabaseにアップロード
      const formData = new FormData();
      formData.append("file", imageFile);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error);

      setUploadedImageUrl(uploadData.imageUrl);
      setUploadedFilePath(uploadData.filePath);

      // 2. AI生成
      const generateRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: uploadData.imageUrl }),
      });
      const generateData = await generateRes.json();
      if (!generateRes.ok) throw new Error(generateData.error);

      setGenerated(generateData);
      setEditedCaption(generateData.caption);
      setEditedHashtags(generateData.hashtags.join(" "));
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setStep("upload");
    }
  }

  // Step 2: Instagram に投稿
  async function handlePost() {
    setError("");
    setStep("posting");

    try {
      const hashtags = editedHashtags
        .split(/[\s,]+/)
        .map((h) => h.replace(/^#/, "").trim())
        .filter(Boolean);

      const res = await fetch("/api/instagram/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: uploadedImageUrl,
          caption: editedCaption,
          hashtags,
          filePath: uploadedFilePath,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setResult({ postId: data.postId, permalink: data.permalink });
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "投稿に失敗しました");
      setStep("preview");
    }
  }

  // リセット
  function handleReset() {
    setStep("upload");
    setImageFile(null);
    setImagePreviewUrl("");
    setUploadedImageUrl("");
    setUploadedFilePath("");
    setGenerated(null);
    setEditedCaption("");
    setEditedHashtags("");
    setResult(null);
    setError("");
  }

  return (
    <div className={styles.layout}>
      {/* サイドバー */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <div className={styles.brand}>
            <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
              <rect width="36" height="36" rx="10" fill="url(#grad2)" />
              <circle cx="18" cy="18" r="8" stroke="white" strokeWidth="2.5" fill="none" />
              <circle cx="25.5" cy="10.5" r="2" fill="white" />
              <defs>
                <linearGradient id="grad2" x1="0" y1="0" x2="36" y2="36">
                  <stop offset="0%" stopColor="#f09433" />
                  <stop offset="50%" stopColor="#dc2743" />
                  <stop offset="100%" stopColor="#bc1888" />
                </linearGradient>
              </defs>
            </svg>
            <span className={styles.brandName}>Autoposter</span>
          </div>

          <nav className={styles.nav}>
            <div className={`${styles.navItem} ${styles.navActive}`}>
              <span>📸</span> 新規投稿
            </div>
          </nav>
        </div>

        <div className={styles.sidebarBottom}>
          <div className={styles.stepIndicator}>
            <StepDot num={1} label="アップロード" active={step === "upload"} done={["generating","preview","posting","done"].includes(step)} />
            <div className={styles.stepLine} />
            <StepDot num={2} label="AI生成" active={step === "generating"} done={["preview","posting","done"].includes(step)} />
            <div className={styles.stepLine} />
            <StepDot num={3} label="確認・編集" active={step === "preview"} done={["posting","done"].includes(step)} />
            <div className={styles.stepLine} />
            <StepDot num={4} label="投稿完了" active={step === "posting" || step === "done"} done={step === "done"} />
          </div>

          <button onClick={handleLogout} className={styles.logoutBtn}>
            ログアウト
          </button>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>
            {step === "upload" && "写真をアップロード"}
            {step === "generating" && "AIが解析中..."}
            {step === "preview" && "投稿内容を確認"}
            {step === "posting" && "投稿中..."}
            {step === "done" && "投稿完了！"}
          </h1>
        </div>

        {error && (
          <div className={styles.errorBanner}>
            ⚠ {error}
          </div>
        )}

        {/* STEP: アップロード */}
        {step === "upload" && (
          <div className={styles.section}>
            <div
              className={`${styles.dropzone} ${isDragging ? styles.dragging : ""} ${imageFile ? styles.hasFile : ""}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => document.getElementById("fileInput")?.click()}
            >
              {imageFile ? (
                <div className={styles.preview}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreviewUrl} alt="preview" className={styles.previewImg} />
                  <div className={styles.previewOverlay}>
                    <span>クリックで変更</span>
                  </div>
                </div>
              ) : (
                <div className={styles.dropzoneInner}>
                  <div className={styles.uploadIcon}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                    </svg>
                  </div>
                  <p className={styles.dropText}>ここに写真をドロップ</p>
                  <p className={styles.dropSub}>または クリックして選択</p>
                  <p className={styles.dropNote}>JPEG・PNG・WebP / 最大8MB</p>
                </div>
              )}
            </div>

            <input
              id="fileInput"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />

            {imageFile && (
              <button
                className={styles.primaryBtn}
                onClick={handleUploadAndGenerate}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a10 10 0 110 20 10 10 0 010-20z" />
                  <path d="M12 8v4l3 3" />
                </svg>
                AIで投稿文を生成する
              </button>
            )}
          </div>
        )}

        {/* STEP: 生成中 */}
        {step === "generating" && (
          <div className={styles.loadingSection}>
            <div className={styles.loadingCard}>
              {imagePreviewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreviewUrl} alt="preview" className={styles.loadingThumb} />
              )}
              <div className={styles.loadingContent}>
                <div className={styles.loadingSpinner} />
                <p className={styles.loadingTitle}>AIが画像を解析しています</p>
                <p className={styles.loadingDesc}>
                  画像の内容を理解して<br />
                  最適な投稿文とハッシュタグを生成中...
                </p>
                <div className={styles.loadingSteps}>
                  <LoadingStep text="画像をアップロード中" done />
                  <LoadingStep text="AIが画像を解析中" active />
                  <LoadingStep text="投稿文を生成中" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP: プレビュー・編集 */}
        {step === "preview" && generated && (
          <div className={styles.previewSection}>
            <div className={styles.previewGrid}>
              {/* 左: 画像 */}
              <div className={styles.previewLeft}>
                <div className={styles.igFrame}>
                  <div className={styles.igHeader}>
                    <div className={styles.igAvatar} />
                    <div>
                      <div className={styles.igUsername}>your_account</div>
                      <div className={styles.igLocation}>Japan</div>
                    </div>
                    <span className={styles.igDots}>•••</span>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreviewUrl} alt="post" className={styles.igImage} />
                  <div className={styles.igFooter}>
                    <div className={styles.igActions}>
                      <span>🤍</span><span>💬</span><span>📤</span>
                    </div>
                    <p className={styles.igCaption}>
                      <strong>your_account</strong> {editedCaption}
                    </p>
                  </div>
                </div>
              </div>

              {/* 右: 編集 */}
              <div className={styles.previewRight}>
                <div className={styles.editSection}>
                  <label className={styles.editLabel}>
                    ✏️ 投稿文
                    <span className={styles.editCount}>{editedCaption.length}文字</span>
                  </label>
                  <textarea
                    className={styles.editTextarea}
                    value={editedCaption}
                    onChange={(e) => setEditedCaption(e.target.value)}
                    rows={8}
                  />
                </div>

                <div className={styles.editSection}>
                  <label className={styles.editLabel}>
                    # ハッシュタグ
                    <span className={styles.editCount}>
                      {editedHashtags.split(/[\s,]+/).filter(Boolean).length}個
                    </span>
                  </label>
                  <textarea
                    className={styles.editTextarea}
                    value={editedHashtags}
                    onChange={(e) => setEditedHashtags(e.target.value)}
                    rows={4}
                    placeholder="タグをスペース区切りで入力（# は不要）"
                  />
                  <div className={styles.hashtagPills}>
                    {editedHashtags
                      .split(/[\s,]+/)
                      .filter(Boolean)
                      .slice(0, 10)
                      .map((tag, i) => (
                        <span key={i} className={styles.pill}>
                          #{tag.replace(/^#/, "")}
                        </span>
                      ))}
                    {editedHashtags.split(/[\s,]+/).filter(Boolean).length > 10 && (
                      <span className={styles.pillMore}>
                        +{editedHashtags.split(/[\s,]+/).filter(Boolean).length - 10}
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles.actionBtns}>
                  <button className={styles.secondaryBtn} onClick={handleReset}>
                    やり直す
                  </button>
                  <button className={styles.postBtn} onClick={handlePost}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                    Instagramに投稿する
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP: 投稿中 */}
        {step === "posting" && (
          <div className={styles.loadingSection}>
            <div className={styles.loadingCard}>
              <div className={styles.loadingContent}>
                <div className={styles.postingSpinner}>
                  <svg width="60" height="60" viewBox="0 0 36 36" fill="none">
                    <rect width="36" height="36" rx="10" fill="url(#grad3)" />
                    <circle cx="18" cy="18" r="8" stroke="white" strokeWidth="2.5" fill="none" />
                    <circle cx="25.5" cy="10.5" r="2" fill="white" />
                    <defs>
                      <linearGradient id="grad3" x1="0" y1="0" x2="36" y2="36">
                        <stop offset="0%" stopColor="#f09433" />
                        <stop offset="50%" stopColor="#dc2743" />
                        <stop offset="100%" stopColor="#bc1888" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <p className={styles.loadingTitle}>Instagramに投稿中...</p>
                <p className={styles.loadingDesc}>Meta APIと通信しています。<br />しばらくお待ちください。</p>
              </div>
            </div>
          </div>
        )}

        {/* STEP: 完了 */}
        {step === "done" && result && (
          <div className={styles.doneSection}>
            <div className={styles.doneCard}>
              <div className={styles.doneIcon}>🎉</div>
              <h2 className={styles.doneTitle}>投稿完了！</h2>
              <p className={styles.doneSub}>Instagramへの投稿が成功しました</p>

              <div className={styles.doneInfo}>
                <div className={styles.doneRow}>
                  <span className={styles.doneRowLabel}>投稿ID</span>
                  <code className={styles.doneRowValue}>{result.postId}</code>
                </div>
                <div className={styles.doneRow}>
                  <span className={styles.doneRowLabel}>URL</span>
                  <a href={result.permalink} target="_blank" rel="noopener noreferrer" className={styles.doneLink}>
                    Instagramで確認 →
                  </a>
                </div>
              </div>

              {imagePreviewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreviewUrl} alt="posted" className={styles.doneThumb} />
              )}

              <button className={styles.primaryBtn} onClick={handleReset}>
                次の投稿を作成する
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StepDot({ num, label, active, done }: { num: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className={`${styles.stepDot} ${active ? styles.stepActive : ""} ${done ? styles.stepDone : ""}`}>
      <div className={styles.stepCircle}>
        {done ? "✓" : num}
      </div>
      <span className={styles.stepLabel}>{label}</span>
    </div>
  );
}

function LoadingStep({ text, done, active }: { text: string; done?: boolean; active?: boolean }) {
  return (
    <div className={`${styles.loadingStep} ${done ? styles.loadingStepDone : ""} ${active ? styles.loadingStepActive : ""}`}>
      <div className={styles.loadingStepDot} />
      <span>{text}</span>
    </div>
  );
}
