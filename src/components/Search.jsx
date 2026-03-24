// src/components/Search.jsx
import React, { useState } from "react";
import { Form, InputGroup, Button } from "react-bootstrap";
import { Search as SearchIcon } from "react-bootstrap-icons";

export default function Search() {
    const [query, setQuery] = useState("");
    const [focused, setFocused] = useState(false);

    const handleSearch = (e) => {
        e.preventDefault();
        console.log("Searching for:", query); // replace with real search logic
    };

    const containerStyle = {
        maxWidth: 700,
        margin: "40px auto",
        padding: "24px",
        textAlign: "center",
    };

    const cardStyle = {
        background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
        padding: "20px",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.04)",
        boxShadow: focused
            ? "0 10px 30px rgba(3,7,18,0.7), inset 0 1px 0 rgba(255,255,255,0.02)"
            : "0 6px 18px rgba(0,0,0,0.7)",
        transition: "box-shadow 180ms ease, transform 180ms ease",
        transform: focused ? "translateY(-2px)" : "none",
    };

    const titleStyle = {
        color: "#fff",
        marginBottom: 14,
        fontSize: 20,
        fontWeight: 600,
    };

    const inputStyle = {
        background: "#0f1417",
        border: "1px solid rgba(255,255,255,0.06)",
        color: "#fff",
        padding: "12px 16px",
        borderRadius: 999,
        boxShadow: focused ? "0 6px 20px rgba(2,6,23,0.6)" : "none",
        transition: "box-shadow 180ms ease, border 120ms ease",
        outline: "none",
    };

    const iconWrapStyle = {
        background: "transparent",
        border: "none",
        color: "#9aa4b2",
        display: "flex",
        alignItems: "center",
        padding: "0 8px",
    };

    const buttonStyle = {
        borderRadius: 999,
        padding: "8px 14px",
        marginLeft: 8,
        background: "linear-gradient(180deg,#2d3748,#1f2933)",
        border: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "transform 140ms ease, box-shadow 140ms ease",
    };

    return (
        <div style={containerStyle}>
            <div style={cardStyle}>
                <h2 style={titleStyle}>Search</h2>

                <Form onSubmit={handleSearch}>
                    <InputGroup className="align-items-center" style={{ maxWidth: 620, margin: "0 auto" }}>
                        <InputGroup.Text style={iconWrapStyle} aria-hidden={true}>
                            <SearchIcon size={18} />
                        </InputGroup.Text>

                        <Form.Control
                            type="text"
                            placeholder="Search..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onFocus={() => setFocused(true)}
                            onBlur={() => setFocused(false)}
                            aria-label="Search"
                            style={inputStyle}
                        />

                        <Button
                            type="submit"
                            variant="dark"
                            aria-label="Submit search"
                            style={buttonStyle}
                            onMouseDown={(e) => e.currentTarget.style.transform = "translateY(1px)"}
                            onMouseUp={(e) => e.currentTarget.style.transform = "translateY(0)"}
                            onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                        >
                            <SearchIcon style={{ color: "#e6eef8" }} />
                        </Button>
                    </InputGroup>
                </Form>
            </div>
        </div>
    );
}