// src/components/Profile.jsx
import React, { useEffect, useState, useRef } from "react";
import profilePic from "../assets/profile_picture.jpg";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

const API_BASE = "https://instalike-fa-d3byh9fsdvdjaygm.westus2-01.azurewebsites.net/api";

export default function Profile() {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState("");
    const [deleteMode, setDeleteMode] = useState(false);
    const [selectedImages, setSelectedImages] = useState([]);
    const wsRef = useRef(null);

    // Lightbox / modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    // focus restore + refs for a11y & focus-trap
    const lastFocusedRef = useRef(null);
    const modalRef = useRef(null);
    const closeBtnRef = useRef(null);

    // small de-dupe cache for WS messages (avoid processing identical messages repeatedly)
    const recentWsRef = useRef(new Set());
    const reconnectAttemptsRef = useRef(0);
    const isMountedRef = useRef(true);

    // Normalize blob names (fix invisible characters)
    const normalize = (s = "") => s.replace(/\u202f/g, " ").replace(/\s+/g, " ").trim();

    // --------------------------
    // Load images initially (uses AbortController for safety)
    // --------------------------
    const loadImages = React.useCallback(async () => {
        setLoading(true);
        const controller = new AbortController();
        const signal = controller.signal;
        try {
            const res = await fetch(`${API_BASE}/get_processed_images`, { signal });
            if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
            const data = await res.json();
            if (!isMountedRef.current) return;
            setImages(
                data.map((img) => ({
                    url: img.url + `?t=${Date.now()}`,
                    blobName: img.blobName,
                    processing: false,
                }))
            );
            setStatus("");
        } catch (err) {
            if (err.name !== "AbortError") {
                console.error("loadImages error:", err);
                if (isMountedRef.current) setStatus("Failed to load images");
            }
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
        return () => controller.abort();
    }, []);

    // --------------------------
    // WebSocket with simple reconnect/backoff
    // --------------------------
    const setupWebSocket = React.useCallback(async () => {
        // already connected
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

        try {
            const tokenRes = await fetch(`${API_BASE}/get_ws_token`);
            if (!tokenRes.ok) throw new Error("Failed to get WS token");
            const tokenData = await tokenRes.json();

            const ws = new WebSocket(tokenData.url);
            wsRef.current = ws;

            ws.onopen = () => {
                reconnectAttemptsRef.current = 0;
            };

            ws.onmessage = (event) => {
                try {
                    let msg = JSON.parse(event.data);
                    if (typeof msg === "string") msg = JSON.parse(msg);

                    // dedupe key: event|normalizedBlob|processed_at|url
                    const key = `${msg.event}|${normalize(msg.blobName || "")}|${msg.processed_at || ""}|${msg.url || ""}`;
                    if (recentWsRef.current.has(key)) return;
                    recentWsRef.current.add(key);
                    setTimeout(() => recentWsRef.current.delete(key), 8000);

                    // --------------------------
                    // Handle new images (skip placeholders)
                    // --------------------------
                    if (msg.event === "new_image") {
                        setImages((prev) => {
                            const normalizedName = normalize(msg.blobName);

                            // Remove any existing skeleton/upload for this blobName and any upload skeletons
                            const withoutSkeleton = prev.filter(
                                (img) => normalize(img.blobName) !== normalizedName && !img.uploading
                            );

                            const newImage = {
                                url: msg.url + `?t=${Date.now()}`,
                                blobName: msg.blobName,
                                processing: false,
                                loaded: false
                            };

                            // Add new image at the top
                            return [newImage, ...withoutSkeleton];
                        });
                    }

                    // --------------------------
                    // Handle deletions
                    // --------------------------
                    if (msg.event === "delete_image") {
                        setImages((prev) =>
                            prev.map((img) =>
                                normalize(img.blobName) === normalize(msg.blobName)
                                    ? { ...img, deleting: true }
                                    : img
                            )
                        );

                        setTimeout(() => {
                            if (!isMountedRef.current) return;
                            setImages((prev) =>
                                prev.filter((img) => normalize(img.blobName) !== normalize(msg.blobName))
                            );
                        }, 300);

                        setSelectedImages((prev) =>
                            prev.filter((b) => normalize(b) !== normalize(msg.blobName))
                        );
                    }
                } catch (err) {
                    console.error("WS parse error:", err);
                }
            };

            ws.onclose = () => {
                // try reconnect with exponential backoff up to a limit
                if (!isMountedRef.current) return;
                const attempts = reconnectAttemptsRef.current + 1;
                reconnectAttemptsRef.current = attempts;
                const delay = Math.min(30000, 500 * 2 ** attempts);
                setTimeout(() => {
                    if (isMountedRef.current) setupWebSocket();
                }, delay);
            };

            ws.onerror = (err) => {
                console.error("WebSocket error:", err);
                // close; onclose will schedule reconnect
                try { ws.close(); } catch (e) {}
            };
        } catch (err) {
            console.error("WebSocket connection failed:", err);
            // schedule reconnect
            if (!isMountedRef.current) return;
            reconnectAttemptsRef.current++;
            const delay = Math.min(30000, 500 * 2 ** reconnectAttemptsRef.current);
            setTimeout(() => {
                if (isMountedRef.current) setupWebSocket();
            }, delay);
        }
    }, []);

    useEffect(() => {
        isMountedRef.current = true;
        loadImages();
        setupWebSocket();
        return () => {
            isMountedRef.current = false;
            try {
                wsRef.current?.close();
            } catch (e) {}
            recentWsRef.current.clear();
        };
    }, [loadImages, setupWebSocket]);

    // --------------------------
    // Lightbox: open / close / nav (memoized)
    // --------------------------
    const openModal = React.useCallback((blobName) => {
        const idx = images.findIndex((img) => normalize(img.blobName || "") === normalize(blobName || ""));
        if (idx === -1) return;
        lastFocusedRef.current = document.activeElement;
        setCurrentIndex(idx);
        setModalOpen(true);
    }, [images]);

    const closeModal = React.useCallback(() => {
        setModalOpen(false);
        // restore focus after a tick
        setTimeout(() => {
            try {
                lastFocusedRef.current?.focus?.();
            } catch (e) {}
        }, 0);
    }, []);

    const nextImage = React.useCallback(() => {
        if (!images.length) return;
        setCurrentIndex((i) => (i + 1) % images.length);
    }, [images.length]);

    const prevImage = React.useCallback(() => {
        if (!images.length) return;
        setCurrentIndex((i) => (i - 1 + images.length) % images.length);
    }, [images.length]);

    // keyboard navigation when modal is open & focus trapping
    useEffect(() => {
        if (!modalOpen) return;
        const onKey = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                closeModal();
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                nextImage();
            } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                prevImage();
            } else if (e.key === "Tab") {
                // simple focus trap
                const modal = modalRef.current;
                if (!modal) return;
                const focusable = modal.querySelectorAll(
                    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
                );
                if (!focusable.length) return;
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    (last).focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    (first).focus();
                }
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [modalOpen, nextImage, prevImage, closeModal]);

    // If images list shrinks and currentIndex is out of bounds, clamp it
    useEffect(() => {
        if (currentIndex >= images.length) {
            setCurrentIndex(Math.max(0, images.length - 1));
        }
    }, [images.length, currentIndex]);

    // Preload current, next and prev images for snappy nav
    useEffect(() => {
        if (!modalOpen || !images.length) return;
        const toPreload = [];
        const cur = images[currentIndex];
        if (cur && cur.url) toPreload.push(cur.url);
        const next = images[(currentIndex + 1) % images.length];
        const prev = images[(currentIndex - 1 + images.length) % images.length];
        if (next && next.url) toPreload.push(next.url);
        if (prev && prev.url) toPreload.push(prev.url);

        const loaders = toPreload.map((u) => {
            const im = new Image();
            im.src = u;
            return im;
        });
        return () => {
            // allow GC
        };
    }, [modalOpen, currentIndex, images]);

    // --------------------------
    // Select images
    // --------------------------
    const toggleSelect = React.useCallback((blobName) => {
        setSelectedImages((prev) =>
            prev.includes(blobName) ? prev.filter((b) => b !== blobName) : [...prev, blobName]
        );
    }, []);

    // --------------------------
    // Batch delete
    // --------------------------
    const batchDelete = React.useCallback(async () => {
        if (!selectedImages.length) return;
        if (!window.confirm(`Delete ${selectedImages.length} image(s)? This cannot be undone.`)) return;

        try {
            const promises = selectedImages.map((blobName) =>
                fetch(`${API_BASE}/delete_blob`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ blobName }),
                })
            );
            await Promise.all(promises);
            setSelectedImages([]);
            setDeleteMode(false);
            setStatus("");
        } catch (err) {
            console.error("batchDelete error:", err);
            setStatus("Delete failed");
        }
    }, [selectedImages]);

    // --------------------------
    // Upload image
    // --------------------------
    const uploadImage = React.useCallback(async (file) => {
        const tempId = "upload-" + Date.now();

        // show skeleton immediately
        setImages((prev) => [{ blobName: tempId, processing: true, uploading: true }, ...prev]);

        setStatus("Uploading image...");

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch(`${API_BASE}/upload_blob`, { method: "POST", body: formData });

            if (!res.ok) throw new Error(await res.text());

            setStatus("Upload successful! Processing...");
        } catch (err) {
            console.error("uploadImage error:", err);
            setStatus("Upload failed");
            // remove the skeleton
            setImages((prev) => prev.filter((i) => i.blobName !== tempId));
        }
    }, []);

    // --------------------------
    // Render
    // --------------------------
    return (
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: 20 }}>
            {/* Profile Header */}
            <div style={{ textAlign: "center", marginBottom: 30 }}>
                <img
                    src={profilePic}
                    alt="Profile"
                    style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover", marginBottom: 15 }}
                />
                <h1 style={{ margin: 5 }}>Trevor England</h1>
                <p style={{ color: "#aaa" }}>@trevorengland</p>
                <div style={{ display: "flex", justifyContent: "center", gap: 20 }}>
                    <span>{images.length} Posts</span>
                    <span>0 Followers</span>
                    <span>0 Following</span>
                </div>
            </div>

            {/* Gallery - use grid so rows contain exactly 3 items */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
                {loading
                    ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="shimmer-skeleton" />)
                    : images.map((img, idx) => {
                            const isSelected = selectedImages.includes(img.blobName);
                            return (
                                <div
                                    key={img.blobName + (img.url || "")}
                                    className={`photo-container ${img.deleting ? "deleting" : ""}`}
                                    style={{
                                        borderRadius: 8,
                                        overflow: "hidden",
                                        position: "relative",
                                        cursor: deleteMode ? "pointer" : "pointer",
                                    }}
                                    onClick={() =>
                                        deleteMode ? toggleSelect(img.blobName) : openModal(img.blobName)
                                    }
                                >
                                    {img.processing || img.uploading || !img.loaded ? (
                                <div className="shimmer-skeleton" />
                                ) : (
                                <img
                                    src={img.url}
                                    alt=""
                                    onLoad={() => {
                                    setImages(prev =>
                                        prev.map(i =>
                                        i.blobName === img.blobName ? { ...i, loaded: true } : i
                                        )
                                    );
                                    }}
                                />
                                )}

                                    {/* overlay when in delete mode */}
                                    {deleteMode && (
                                        <>
                                            <div className={`select-overlay ${isSelected ? "selected" : ""}`} />
                                            <div className={`check-badge ${isSelected ? "checked" : ""}`}>
                                                <i className={isSelected ? "bi bi-check-lg" : "bi bi-circle"} />
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
            </div>

            {/* Delete Mode Status Bar */}
            {deleteMode && (
                <div
                    style={{
                        position: "fixed",
                        bottom: 100,
                        right: 30,
                        background: "#dc3545",
                        color: "#fff",
                        padding: "8px 12px",
                        borderRadius: 8,
                        zIndex: 1000,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        boxShadow: "0 6px 18px rgba(220,53,69,0.18)",
                    }}
                >
                    <button
                        className="btn btn-light btn-sm"
                        style={{ background: "#fff", color: "#dc3545", fontWeight: "600" }}
                        onClick={batchDelete}
                    >
                        Delete Selected ({selectedImages.length})
                    </button>
                    <button
                        className="btn btn-light btn-sm"
                        onClick={() => {
                            setDeleteMode(false);
                            setSelectedImages([]);
                        }}
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* Floating Buttons (nicer) */}
            <div style={{ position: "fixed", bottom: 30, right: 30, display: "flex", gap: 14, alignItems: "center" }}>
                <button
                    aria-label="Enter delete mode"
                    title={deleteMode ? "Exit delete mode" : "Delete photos"}
                    className="fab-btn danger"
                    onClick={() => setDeleteMode((prev) => !prev)}
                >
                    <i className={deleteMode ? "bi bi-x-lg" : "bi bi-trash"} />
                </button>

                <label
                    title="Upload"
                    className="fab-btn primary"
                    style={{ cursor: "pointer" }}
                >
                    <i className="bi bi-plus-lg" />
                    <input
                        type="file"
                        style={{ display: "none" }}
                        onChange={(e) => {
                            if (e.target.files.length) uploadImage(e.target.files[0]);
                            e.target.value = "";
                        }}
                    />
                </label>
            </div>

            {/* Production-like Lightbox Modal */}
            {modalOpen && (
                <>
                    <div
                        className="modal show d-block"
                        tabIndex="-1"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Image viewer"
                        onMouseDown={(e) => {
                            // close when clicking the backdrop (mouseDown ensures it fires before inner click handlers)
                            if (e.target === e.currentTarget) closeModal();
                        }}
                        style={{ zIndex: 2000 }}
                    >
                        <div
                            className="modal-dialog modal-dialog-centered"
                            role="document"
                            onClick={(e) => e.stopPropagation()}
                            style={{ maxWidth: "1200px", width: "95%", margin: "0 auto" }}
                        >
                            <div
                                className="modal-content bg-transparent border-0"
                                ref={modalRef}
                            >
                                <div className="modal-body p-0" style={{ position: "relative", background: "rgba(6,6,6,0.92)", borderRadius: 8, padding: 16, boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}>
                                    {/* Top controls */}
                                    <div style={{ position: "absolute", top: 12, right: 12, zIndex: 6, display: "flex", gap: 8 }}>
                                        <a
                                            href={images[currentIndex]?.url || "#"}
                                            download
                                            className="btn btn-light btn-sm"
                                            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                                            title="Download image"
                                        >
                                            <i className="bi bi-download" /> Download
                                        </a>
                                        <button
                                            className="btn btn-light btn-sm"
                                            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                                            onClick={() => {
                                                // attempt navigator.share if available
                                                const url = images[currentIndex]?.url;
                                                if (navigator.share && url) {
                                                    navigator.share({ title: "Photo", url }).catch(() => {});
                                                } else {
                                                    // fallback: copy link
                                                    if (url) {
                                                        navigator.clipboard?.writeText(url).then(() => {
                                                            setStatus("Image link copied");
                                                            setTimeout(() => setStatus(""), 1500);
                                                        });
                                                    }
                                                }
                                            }}
                                            title="Share image"
                                        >
                                            <i className="bi bi-share-fill" /> Share
                                        </button>
                                        <button
                                            ref={closeBtnRef}
                                            className="btn btn-light btn-sm"
                                            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                                            onClick={closeModal}
                                            aria-label="Close viewer"
                                        >
                                            <i className="bi bi-x-lg" />
                                        </button>
                                    </div>

                                    {/* Prev */}
                                    <button
                                        className="btn btn-dark btn-sm nav-btn"
                                        style={{ position: "absolute", top: "50%", left: 8, transform: "translateY(-50%)", zIndex: 5 }}
                                        onClick={prevImage}
                                        aria-label="Previous image"
                                    >
                                        <i className="bi bi-chevron-left" />
                                    </button>

                                    {/* Next */}
                                    <button
                                        className="btn btn-dark btn-sm nav-btn"
                                        style={{ position: "absolute", top: "50%", right: 8, transform: "translateY(-50%)", zIndex: 5 }}
                                        onClick={nextImage}
                                        aria-label="Next image"
                                    >
                                        <i className="bi bi-chevron-right" />
                                    </button>

                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 12px" }}>
                                        {images[currentIndex] && images[currentIndex].url ? (
                                            <img
                                                src={images[currentIndex].url}
                                                alt={`Image ${currentIndex + 1}`}
                                                className="lightbox-image"
                                            />
                                        ) : (
                                            <div className="shimmer-skeleton lightbox-skel" style={{ width: "80vw", height: "60vh", borderRadius: 6 }} />
                                        )}
                                    </div>

                                    {/* caption / index + thumbnails */}
                                    <div style={{ color: "#fff", padding: "10px 6px 6px 6px", textAlign: "center" }}>
                                        <div style={{ marginBottom: 8 }}>
                                            <small>{currentIndex + 1} / {Math.max(1, images.length)}</small>
                                        </div>
                                        <div className="thumb-strip" role="list" aria-label="Image thumbnails">
                                            {images.map((it, i) => (
                                                <button
                                                    key={it.blobName + (it.url || "")}
                                                    className={`thumb ${i === currentIndex ? "active" : ""}`}
                                                    onClick={() => setCurrentIndex(i)}
                                                    aria-label={`View image ${i + 1}`}
                                                >
                                                    <img src={it.url} alt="" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop show" style={{ zIndex: 1990 }} />
                </>
            )}

            <style>{`
                .shimmer-skeleton {
                    width:100%;
                    aspect-ratio: 1 / 1;
                    border-radius:6px;
                    background:#1a1a1a;
                    background-image:linear-gradient(
                        90deg,
                        #1a1a1a 0px,
                        #2a2a2a 40px,
                        #1a1a1a 80px
                    );
                    background-size:600px 100%;
                    animation: shimmer 1.5s infinite linear;
                }
                @keyframes shimmer {
                    0% { background-position:-600px 0; }
                    100% { background-position:600px 0; }
                }
                .deleting {
                    animation: fadeOut 0.3s ease forwards;
                }
                @keyframes fadeOut {
                    from { opacity:1; transform:scale(1); }
                    to { opacity:0; transform:scale(0.95); }
                }

                /* Photo container + selection overlay */
                .photo-container {
                    border-radius:8px;
                    overflow:hidden;
                    position:relative;
                    aspect-ratio: 1 / 1;
                }
                .photo-container img { display:block; width:100%; height:100%; object-fit:cover; }

                .select-overlay {
                    position:absolute;
                    inset:0;
                    background: rgba(0,0,0,0);
                    transition: background 180ms ease;
                    pointer-events:none;
                }
                .photo-container:hover .select-overlay { background: rgba(0,0,0,0.08); }

                .select-overlay.selected { background: rgba(220,53,69,0.28); }

                .check-badge {
                    position:absolute;
                    top:8px;
                    right:8px;
                    width:34px;
                    height:34px;
                    border-radius:50%;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    color: #fff;
                    background: rgba(255,255,255,0.85);
                    box-shadow: 0 6px 14px rgba(0,0,0,0.12);
                    transform: scale(0.95);
                    transition: transform 150ms ease, background 150ms ease, color 150ms ease;
                }
                .check-badge i { font-size:16px; color:#6c757d; }
                .check-badge.checked {
                    background: #dc3545;
                    color: #fff;
                    transform: scale(1.05);
                }
                .check-badge.checked i { color: #fff; }

                /* Floating action buttons */
                .fab-btn {
                    width:64px;
                    height:64px;
                    border-radius: 50%;
                    display:inline-flex;
                    align-items:center;
                    justify-content:center;
                    color:#fff;
                    border: none;
                    outline: none;
                    box-shadow: 0 10px 30px rgba(2,6,23,0.12);
                    transition: transform 150ms ease, box-shadow 150ms ease;
                    font-size:22px;
                    user-select:none;
                }
                .fab-btn:active { transform: translateY(1px) scale(0.995); }
                .fab-btn.primary {
                    background: linear-gradient(180deg,#2b7bff,#0b60f3);
                }
                .fab-btn.danger {
                    background: linear-gradient(180deg,#ff6b6b,#e04343);
                }
                .fab-btn:hover { transform: translateY(-3px); box-shadow: 0 14px 36px rgba(2,6,23,0.16); }
                .fab-btn i { font-size:22px; }

                /* make the hidden input label accessible */
                label.fab-btn { display:inline-flex; align-items:center; justify-content:center; }

                /* Lightbox-specific styles (production-like) */
                .lightbox-image {
                    display:block;
                    max-width: min(1200px, 92vw);
                    max-height: calc(100vh - 160px);
                    width: auto;
                    height: auto;
                    object-fit: contain;
                    border-radius: 6px;
                    box-shadow: 0 18px 50px rgba(0,0,0,0.6);
                    transition: transform 180ms ease, opacity 180ms ease;
                }
                .lightbox-skel { border-radius:8px; }

                .nav-btn {
                    background: rgba(0,0,0,0.48);
                    border: none;
                    color: #fff;
                    width:44px;
                    height:44px;
                    border-radius: 50%;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    box-shadow: 0 8px 28px rgba(0,0,0,0.4);
                }
                .nav-btn:hover { transform: translateY(-2px); }

                .thumb-strip {
                    display:flex;
                    gap:8px;
                    overflow-x:auto;
                    padding:6px 8px;
                    justify-content:center;
                    align-items:center;
                    margin-top:6px;
                }
                .thumb {
                    border: none;
                    padding:0;
                    background: transparent;
                    width:56px;
                    height:56px;
                    border-radius:6px;
                    overflow:hidden;
                    display:inline-flex;
                    align-items:center;
                    justify-content:center;
                    box-shadow: 0 6px 18px rgba(0,0,0,0.35);
                    transition: transform 120ms ease, box-shadow 120ms ease;
                }
                .thumb img { width:100%; height:100%; object-fit:cover; display:block; }
                .thumb.active { box-shadow: 0 10px 28px rgba(0,0,0,0.6); transform: scale(1.04); }
                .thumb:focus { outline: 2px solid rgba(255,255,255,0.14); }

                /* Backdrop tweak for deeper dim */
                .modal-backdrop.show { background: rgba(0,0,0,0.78); }
            `}</style>
        </div>
    );
}