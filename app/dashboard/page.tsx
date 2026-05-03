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
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [generated, setGenerated] = useState<GeneratedContent | null>(null);
  const [editedCaption, setEditedCaption] = useState("");
  const [editedHashtags, setEditedHashtags] = useState("");
  const [result, setResult] = useState<PostResult | null>(null);
  const [error, setError] = useState("");
  const [menuName, setMenuName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  function handleFilesSelect(files: File[]) {
    const validFiles = files.filter(f => f.type.startsWith("image/") && f.size <= 8 * 1024 * 1024);
    if (validFiles.length === 0) {
      setError("有効な画像ファイルを選択してください（最大8MB）");
      return;
    }
    if (validFiles.length > 10) {
      setError("一度に選択できるのは10枚までです");
      return;
    }
    setError("");
    setImageFiles(prev => {
      const newFiles = [...prev, ...validFiles].slice(0, 10);
      return newFiles;
    });
    const newUrls = validFiles.map(f => URL.createObjectURL(f));
    setImagePreviewUrls(prev => [...prev, ...newUrls].slice(0, 10));
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFilesSelect(files);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  function removeImage(index: number) {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
    if (currentPreviewIndex >= index && currentPreviewIndex > 0) {
      setCurrentPreviewIndex(prev => prev - 1);
    }
  }

  async function handleUploadAndGenerate() {
    if (imageFiles.length === 0) return;
    if (!menuName.trim()) {
      setError("メニュー名を入力してください");
      return;
    }
    setError("");
    setStep("generating");

    try {
      // 全画像をアップロード
      const uploadedUrls: string[] = [];
      for (const file of imageFiles) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error);
        uploadedUrls.push(uploadData.imageUrl);
      }
      setUploadedImageUrls(uploadedUrls);

      // 最初の画像でAI生成
      const generateRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: uploadedUrls[0], menuName: menuName.trim() }),
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
          imageUrl: uploadedImageUrls[0],
          imageUrls: uploadedImageUrls,
          caption: editedCaption,
          hashtags,
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

  function handleReset() {
    setStep("upload");
    setImageFiles([]);
    setImagePreviewUrls([]);
    setUploadedImageUrls([]);
    setGenerated(null);
    setEditedCaption("");
    setEditedHashtags("");
    setResult(null);
    setError("");
    setMenuName("");
    setCurrentPreviewIndex(0);
  }

  return (
    <div className={styles.layout}>
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
          <button onClick={handleLogout} className={styles.logoutBtn}>ログアウト</button>
        </div>
      </aside>

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

        {error && <div className={styles.errorBanner}>⚠ {error}</div>}

        {step === "upload" && (
          <div className={styles.section}>
            <div
              className={`${styles.dropzone} ${isDragging ? styles.dragging : ""} ${imageFiles.length > 0 ? styles.hasFile : ""}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => document.getElementById("fileInput")?.click()}
            >
              {imageFiles.length > 0 ? (
                <div className={styles.preview}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreviewUrls[currentPreviewIndex]} alt="preview" className={styles.previewImg} />
                  <div className={styles.previewOverlay}>
                    <span>クリックで追加</span>
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
                  <p className={styles.dropSub}>または クリックして選択（複数可・最大10枚）</p>
                  <p className={styles.dropNote}>JPEG・PNG・WebP / 最大8MB</p>
                </div>
              )}
            </div>

            {imageFiles.length > 0 && (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" }}>
                {imagePreviewUrls.map((url, i) => (
                  <div key={i} style={{ position: "relative", cursor: "pointer" }} onClick={() => setCurrentPreviewIndex(i)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`preview-${i}`}
                      style={{
                        width: "70px",
                        height: "70px",
                        objectFit: "cover",
                        borderRadius: "8px",
                        border: i === currentPreviewIndex ? "2px solid #dc2743" : "2px solid transparent"
                      }}
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                      style={{
                        position: "absolute",
                        top: "-6px",
                        right: "-6px",
                        background: "#dc2743",
                        color: "white",
                        border: "none",
                        borderRadius: "50%",
                        width: "20px",
                        height: "20px",
                        cursor: "pointer",
                        fontSize: "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}

            <input
              id="fileInput"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              style={{ display: "none" }}
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length > 0) handleFilesSelect(files);
              }}
            />

            <div className={styles.editSection} style={{ marginTop: "20px" }}>
              <label className={styles.editLabel}>🍽️ メニュー名</label>
              <input
                type="text"
                className={styles.editTextarea}
                style={{ padding: "10px 12px", borderRadius: "8px", resize: "none", height: "auto" }}
                placeholder="例：鮭の塩焼き定食、豆腐の味噌汁、ひじき煮..."
                value={menuName}
                onChange={(e) => setMenuName(e.target.value)}
              />
            </div>

            {imageFiles.length > 0 && (
              <button className={styles.primaryBtn} onClick={handleUploadAndGenerate}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a10 10 0 110 20 10 10 0 010-20z" />
                  <path d="M12 8v4l3 3" />
                </svg>
                AIで投稿文を生成する（{imageFiles.length}枚）
              </button>
            )}
          </div>
        )}

        {step === "generating" && (
          <div className={styles.loadingSection}>
            <div className={styles.loadingCard}>
              {imagePreviewUrls[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreviewUrls[0]} alt="preview" className={styles.loadingThumb} />
              )}
              <div className={styles.loadingContent}>
                <div className={styles.loadingSpinner} />
                <p className={styles.loadingTitle}>AIが画像を解析しています</p>
                <p className={styles.loadingDesc}>穂乃味らしい投稿文を生成中...</p>
              </div>
            </div>
          </div>
        )}

        {step === "preview" && generated && (
          <div className={styles.previewSection}>
            <div className={styles.previewGrid}>
              <div className={styles.previewLeft}>
                <div className={styles.igFrame}>
                  <div className={styles.igHeader}>
                    <div className={styles.igAvatar} />
                    <div>
                      <div className={styles.igUsername}>honomi_kyushoku</div>
                      <div className={styles.igLocation}>大阪府</div>
                    </div>
                    <span className={styles.igDots}>•••</span>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreviewUrls[currentPreviewIndex]} alt="post" className={styles.igImage} />
                  {imagePreviewUrls.length > 1 && (
                    <div style={{ display: "flex", justifyContent: "center", gap: "4px", padding: "8px" }}>
                      {imagePreviewUrls.map((_, i) => (
                        <div
                          key={i}
                          onClick={() => setCurrentPreviewIndex(i)}
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: i === currentPreviewIndex ? "#dc2743" : "#ccc",
                            cursor: "pointer"
                          }}
                        />
                      ))}
                    </div>
                  )}
                  <div className={styles.igFooter}>
                    <div className={styles.igActions}><span>🤍</span><span>💬</span><span>📤</span></div>
                    <p className={styles.igCaption}><strong>honomi_kyushoku</strong> {editedCaption}</p>
                  </div>
                </div>
              </div>

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
                    <span className={styles.editCount}>{editedHashtags.split(/[\s,]+/).filter(Boolean).length}個</span>
                  </label>
                  <textarea
                    className={styles.editTextarea}
                    value={editedHashtags}
                    onChange={(e) => setEditedHashtags(e.target.value)}
                    rows={4}
                  />
                  <div className={styles.hashtagPills}>
                    {editedHashtags.split(/[\s,]+/).filter(Boolean).slice(0, 10).map((tag, i) => (
                      <span key={i} className={styles.pill}>#{tag.replace(/^#/, "")}</span>
                    ))}
                  </div>
                </div>

                <div className={styles.actionBtns}>
                  <button className={styles.secondaryBtn} onClick={handleReset}>やり直す</button>
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

        {step === "posting" && (
          <div className={styles.loadingSection}>
            <div className={styles.loadingCard}>
              <div className={styles.loadingContent}>
                <div className={styles.loadingSpinner} />
                <p className={styles.loadingTitle}>Instagramに投稿中...</p>
                <p className={styles.loadingDesc}>Meta APIと通信しています。</p>
              </div>
            </div>
          </div>
        )}

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
              <button className={styles.primaryBtn} onClick={handleReset}>次の投稿を作成する</button>
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
      <div className={styles.stepCircle}>{done ? "✓" : num}</div>
      <span className={styles.stepLabel}>{label}</span>
    </div>
  );
}