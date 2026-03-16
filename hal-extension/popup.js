import{r as n,j as e,m as x,c as v}from"./chunks/proxy.BauHwvIM.js";

function w(){
  const [showButton, setShowButton] = n.useState(true);
  n.useEffect(() => {
    chrome.storage.sync.get({ showHalButton: true }, r => { setShowButton(r.showHalButton); });
  }, []);
  const toggle = () => {
    const val = !showButton;
    setShowButton(val);
    chrome.storage.sync.set({ showHalButton: val });
  };
  return e.jsxs("div", {
    style: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderTop:"1px solid rgba(0,212,255,0.06)", marginTop:"8px" },
    children: [
      e.jsxs("div", { children: [
        e.jsx("div", { style: { fontSize:"12px", color:"#8a8a9a" }, children: "Show HAL button on tweets" }),
        e.jsx("div", { style: { fontSize:"10px", color:"#4a4a5a" }, children: "Native bookmarks always mirror to HAL" })
      ]}),
      e.jsx("button", {
        onClick: toggle,
        style: { width:"36px", height:"20px", borderRadius:"10px", border:"none", cursor:"pointer", background: showButton ? "rgba(0,212,255,0.5)" : "rgba(255,255,255,0.1)", position:"relative", transition:"background 0.2s" },
        children: e.jsx("div", { style: { width:"16px", height:"16px", borderRadius:"50%", background: showButton ? "#00d4ff" : "#4a4a5a", position:"absolute", top:"2px", left: showButton ? "18px" : "2px", transition:"left 0.2s, background 0.2s" } })
      })
    ]
  });
}

function C() {
  const [search, setSearch] = n.useState("");
  const [authenticated, setAuthenticated] = n.useState(false);
  const [user, setUser] = n.useState(null);
  const [bookmarkCount, setBookmarkCount] = n.useState(0);
  const [recentBookmarks, setRecentBookmarks] = n.useState([]);
  const [searchResults, setSearchResults] = n.useState([]);
  const [searchLoading, setSearchLoading] = n.useState(false);
  const [loading, setLoading] = n.useState(true);

  n.useEffect(() => {
    chrome.runtime.sendMessage({ type: "GET_AUTH_STATUS" }, res => {
      setAuthenticated(!!(res && res.authenticated));
      if (res && res.user) setUser(res.user);
      setLoading(false);
    });
    chrome.runtime.sendMessage({ type: "GET_BOOKMARK_COUNT" }, res => {
      if (res && res.count !== undefined) setBookmarkCount(res.count);
    });
    chrome.runtime.sendMessage({ type: "GET_BOOKMARKS", params: { pageSize: "5", sort: "created_at", order: "desc" } }, res => {
      if (res && res.data) setRecentBookmarks(res.data);
    });
  }, []);

  n.useEffect(() => {
    const query = search.trim();
    if (!query) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const timer = setTimeout(() => {
      chrome.runtime.sendMessage({ type: "SEARCH_BOOKMARKS", query }, res => {
        setSearchResults((res && res.data) ? res.data : (Array.isArray(res) ? res : []));
        setSearchLoading(false);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleLogin = n.useCallback(() => {
    chrome.runtime.sendMessage({ type: "LOGIN" });
  }, []);

  const handleOpenDashboard = n.useCallback(() => {
    chrome.tabs.create({ url: "https://helloagain-three.vercel.app/dashboard" });
  }, []);

  const timeAgo = dateStr => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const openBookmark = bm => {
    const url = `https://x.com/${bm.x_author_handle}/status/${bm.x_post_id}`;
    chrome.runtime.sendMessage({ type: "OPEN_IN_CURRENT_TAB", url });
  };

  const renderCard = (bm, i) => e.jsxs(x.div, {
    initial: { opacity: 0, x: -10 },
    animate: { opacity: 1, x: 0 },
    transition: { delay: i * 0.05 },
    onClick: () => openBookmark(bm),
    style: { padding:"10px 12px", borderRadius:"8px", marginBottom:"6px", cursor:"pointer", border:"1px solid transparent", transition:"all 0.2s" },
    onMouseEnter: ev => { ev.currentTarget.style.background = "rgba(0,212,255,0.04)"; ev.currentTarget.style.borderColor = "rgba(0,212,255,0.1)"; },
    onMouseLeave: ev => { ev.currentTarget.style.background = "transparent"; ev.currentTarget.style.borderColor = "transparent"; },
    children: [
      e.jsxs("div", { style: { display:"flex", justifyContent:"space-between", marginBottom:"4px" }, children: [
        e.jsxs("span", { style: { fontSize:"13px", fontWeight:600, color:"#00d4ff" }, children: ["@", bm.x_author_handle] }),
        e.jsx("span", { style: { fontSize:"11px", color:"#4a4a5a" }, children: timeAgo(bm.created_at) })
      ]}),
      e.jsx("div", { style: { fontSize:"12px", color:"#8a8a9a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }, children: bm.content_text })
    ]
  }, bm.id);

  if (loading) {
    return e.jsx("div", { style: { padding:"40px", textAlign:"center" }, children:
      e.jsx("div", { style: { color:"#8a8a9a", fontSize:"14px" }, children: "Loading..." })
    });
  }

  if (!authenticated) {
    return e.jsxs("div", {
      style: { padding:"32px", textAlign:"center", minHeight:"300px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" },
      children: [
        e.jsx("div", { style: { width:"48px", height:"48px", borderRadius:"12px", background:"linear-gradient(135deg, #00d4ff, #0ea5e9)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"20px", fontWeight:700, color:"#0a0a0f", marginBottom:"20px", boxShadow:"0 0 20px rgba(0,212,255,0.3)" }, children: "H" }),
        e.jsx("h2", { style: { fontSize:"18px", fontWeight:600, color:"#f0f0f5", marginBottom:"8px" }, children: "Hello Again Links" }),
        e.jsx("p", { style: { fontSize:"13px", color:"#8a8a9a", marginBottom:"24px" }, children: "Sign in to save and search your X bookmarks" }),
        e.jsx(x.button, {
          whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 },
          onClick: handleLogin,
          style: { padding:"12px 24px", borderRadius:"10px", border:"none", background:"linear-gradient(135deg, #00d4ff, #0ea5e9)", color:"#0a0a0f", fontWeight:600, fontSize:"14px", cursor:"pointer", fontFamily:"'Inter', sans-serif" },
          children: "Sign in with X"
        })
      ]
    });
  }

  const isSearching = search.trim().length > 0;
  const listLabel = isSearching ? (searchLoading ? "SEARCHING\u2026" : "RESULTS") : "RECENT";
  const listItems = isSearching ? searchResults : recentBookmarks;

  return e.jsxs("div", {
    style: { padding:"20px", height:"100vh", display:"flex", flexDirection:"column", overflow:"hidden", boxSizing:"border-box" },
    children: [
      // Header
      e.jsxs("div", { style: { display:"flex", alignItems:"center", gap:"10px", marginBottom:"20px" }, children: [
        e.jsx("div", { style: { width:"32px", height:"32px", borderRadius:"8px", background:"linear-gradient(135deg, #00d4ff, #0ea5e9)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px", fontWeight:700, color:"#0a0a0f", boxShadow:"0 0 15px rgba(0,212,255,0.3)" }, children: "H" }),
        e.jsxs("div", { children: [
          e.jsx("span", { style: { fontSize:"14px", fontWeight:600 }, children: (user && user.name) || "HAL" }),
          user && user.handle ? e.jsxs("div", { style: { fontSize:"11px", color:"#4a4a5a" }, children: ["@", user.handle] }) : null
        ]}),
        e.jsx("div", { style: { flex:1 } }),
        e.jsx("span", { style: { fontSize:"12px", color:"#00d4ff", fontWeight:500 }, children: bookmarkCount.toLocaleString() }),
        e.jsx("span", { style: { fontSize:"11px", color:"#4a4a5a" }, children: "saved" })
      ]}),
      // Search
      e.jsxs("div", { style: { position:"relative", marginBottom:"20px" }, children: [
        e.jsx("input", {
          type: "text",
          value: search,
          onChange: ev => setSearch(ev.target.value),
          placeholder: "Search bookmarks...",
          style: { width:"100%", padding: search ? "10px 34px 10px 14px" : "10px 14px", borderRadius:"10px", border:"1px solid rgba(0,212,255,0.1)", background:"rgba(15,16,25,0.8)", color:"#f0f0f5", fontSize:"13px", fontFamily:"'Inter', sans-serif", outline:"none", boxSizing:"border-box" }
        }),
        search ? e.jsx("button", {
          onClick: () => setSearch(""),
          style: { position:"absolute", right:"10px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#4a4a5a", cursor:"pointer", fontSize:"16px", lineHeight:1, padding:"2px 4px" },
          children: "\xd7"
        }) : null
      ]}),
      // List
      e.jsxs("div", { style: { flex:1, overflowY:"auto", minHeight:0 }, children: [
        e.jsx("div", { style: { fontSize:"12px", color:"#4a4a5a", fontWeight:600, marginBottom:"10px", letterSpacing:"0.05em" }, children: listLabel }),
        !isSearching && recentBookmarks.length === 0 ? e.jsx("div", { style: { color:"#4a4a5a", fontSize:"13px", textAlign:"center", padding:"20px" }, children: "No bookmarks yet. Save your first one!" }) : null,
        isSearching && !searchLoading && searchResults.length === 0 ? e.jsx("div", { style: { color:"#4a4a5a", fontSize:"13px", textAlign:"center", padding:"20px" }, children: `No results for "${search.trim()}"` }) : null,
        listItems.map((bm, i) => renderCard(bm, i))
      ]}),
      // Settings
      e.jsx(w, {}),
      // Footer
      e.jsxs("div", { style: { borderTop:"1px solid rgba(0,212,255,0.06)", paddingTop:"12px", display:"flex", justifyContent:"space-between" }, children: [
        e.jsx("button", { onClick: handleOpenDashboard, style: { background:"none", border:"none", color:"#00d4ff", fontSize:"12px", cursor:"pointer", fontFamily:"'Inter', sans-serif" }, children: "Open Dashboard \u2192" }),
        e.jsx("button", { onClick: () => chrome.runtime.sendMessage({ type: "LOGOUT" }, () => setAuthenticated(false)), style: { background:"none", border:"none", color:"#4a4a5a", fontSize:"12px", cursor:"pointer", fontFamily:"'Inter', sans-serif" }, children: "Sign out" })
      ]})
    ]
  });
}

const z = v.createRoot(document.getElementById("root"));
z.render(e.jsx(C, {}));
