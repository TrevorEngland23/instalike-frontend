// src/components/Sidebar.jsx
// src/components/Sidebar.jsx
import { useState } from "react";
import profilePic from "../assets/profile_picture.jpg";
import logo from "../assets/instalike-logo.png";
import { House, Search } from "react-bootstrap-icons"; // Bootstrap icons

export default function Sidebar({ currentView, setCurrentView }) {
    const [hovered, setHovered] = useState(null);

    return (
        <div style={{
            width: 140,
            background: "#111",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "20px",
            gap: 30
        }}>
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40, justifyContent: "center", width: "100%" }}>
                <img src={logo} alt="Logo" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                <span style={{ color: "#fff", fontSize: 18, fontWeight: 600 }}>Instalike</span>
            </div>

            {/* Profile Button */}
            <button
                className={`nav-btn ${currentView === "profile" ? "active" : ""}`}
                style={navBtnStyle(currentView === "profile", hovered === "profile")}
                onClick={() => setCurrentView("profile")}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setHovered("profile")}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(null)}
                onBlur={() => setHovered(null)}
            >
                <img src={profilePic} alt="Profile" style={{ width: 36, height: 36, borderRadius: "50%" }} />
            </button>

            {/* Feed Button */}
            <button
                className={`nav-btn ${currentView === "feed" ? "active" : ""}`}
                style={navBtnStyle(currentView === "feed", hovered === "feed")}
                onClick={() => setCurrentView("feed")}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setHovered("feed")}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(null)}
                onBlur={() => setHovered(null)}
            >
                <House size={24} />
            </button>

            {/* Search Button */}
            <button
                className={`nav-btn ${currentView === "search" ? "active" : ""}`}
                style={navBtnStyle(currentView === "search", hovered === "search")}
                onClick={() => setCurrentView("search")}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setHovered("search")}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(null)}
                onBlur={() => setHovered(null)}
            >
                <Search size={24} />
                <span style={{ fontSize: 15 }}>Search</span>
            </button>
        </div>
    );
}

const navBtnStyle = (active, hover) => ({
    background: hover ? "#1b1b1b" : "transparent", // only hover shows grey background
    border: "none",
    color: (active || hover) ? "#fff" : "#aaa",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    padding: "8px 10px", // tighter padding so the background isn't a wide square
    borderRadius: 10, // rounded for a more natural/pill look
    width: "auto",
    minWidth: 72,
    transition: "background 120ms ease, color 120ms ease",
    outline: "none",
});