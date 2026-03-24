import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Profile from "./components/Profile";
import Feed from "./components/Feed";
import Search from "./components/Search";

export default function App() {
  const [currentView, setCurrentView] = useState(
    localStorage.getItem("lastView") || "profile"
  );

  useEffect(() => {
    localStorage.setItem("lastView", currentView);
  }, [currentView]);

  const renderView = () => {
    switch (currentView) {
      case "profile": return <Profile />;
      case "feed": return <Feed />;
      case "search": return <Search />;
      default: return <Feed />;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      <div style={{ flex: 1, padding: 30, background: "#0f0f0f", color: "#e0e0e0" }}>
        {renderView()}
      </div>
    </div>
  );
}