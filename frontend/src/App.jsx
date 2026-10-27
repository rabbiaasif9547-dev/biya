
import { useEffect, useCallback, useState } from "react";
import "./App.css";

// Deployed BIYA backend URLs
const API = "https://biya-backend.vercel.app/api/problems";
const AUTH_API = "https://biya-backend.vercel.app/api/auth";

const categories = [
  "Personal",
  "Education",
  "Work",
  "Technology",
  "Other",
];

const emptyForm = {
  title: "",
  description: "",
  category: "Technology",
  desiredOutcome: "",
};

function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem("biyaToken") || ""
  );

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("biyaUser") || "null");
    } catch {
      return null;
    }
  });

  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [problems, setProblems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState(null);

  const handleAuthChange = (event) => {
    setAuthForm({
      ...authForm,
      [event.target.name]: event.target.value,
    });
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    setError("");
    setNotice("");

    try {
      const endpoint =
        authMode === "signup" ? "/signup" : "/login";

      const payload =
        authMode === "signup"
          ? authForm
          : {
              email: authForm.email,
              password: authForm.password,
            };

      const response = await fetch(`${AUTH_API}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Request failed.");
      }

      if (authMode === "signup") {
        setAuthMode("login");
        setAuthForm({
          name: "",
          email: authForm.email,
          password: "",
        });
        setNotice("Account created! Please log in.");
        return;
      }

      if (!result.token || !result.user) {
        throw new Error("Login response is incomplete.");
      }

      localStorage.setItem("biyaToken", result.token);
      localStorage.setItem("biyaUser", JSON.stringify(result.user));

      setToken(result.token);
      setUser(result.user);
      setAuthForm({ name: "", email: "", password: "" });
      setNotice("Login successful!");
    } catch (err) {
      setAuthError(
        err.message || "Authentication failed."
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("biyaToken");
    localStorage.removeItem("biyaUser");

    setToken("");
    setUser(null);
    setProblems([]);
    setEditingId(null);
    setForm(emptyForm);
    setSearch("");
    setFilter("All");
    setError("");
    setNotice("");
    setAuthError("");
  };

  const fetchProblems = useCallback(async () => {
    if (!token) {
      setProblems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(API, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (response.status === 401 || response.status === 403) {
        handleLogout();
        throw new Error("Session expired. Please log in again.");
      }

      if (!response.ok) {
        throw new Error(
          result.message || "Could not load problems."
        );
      }

      setProblems(result.data || []);
    } catch (err) {
      setError(
        err.message ||
          "Backend connection failed. Check MongoDB and backend."
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token && user) {
      fetchProblems();
    } else {
      setProblems([]);
      setLoading(false);
    }
  }, [token, user, fetchProblems]);

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const url = editingId ? `${API}/${editingId}` : API;
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Could not save problem."
        );
      }

      setForm(emptyForm);
      setEditingId(null);
      setNotice(
        editingId
          ? "Problem updated successfully!"
          : "Problem added successfully!"
      );

      await fetchProblems();
    } catch (err) {
      setError(err.message || "Request failed.");
    } finally {
      setSaving(false);
    }
  };

  const editProblem = (problem) => {
    setForm({
      title: problem.title,
      description: problem.description,
      category: problem.category,
      desiredOutcome: problem.desiredOutcome,
    });

    setEditingId(problem._id);
    setNotice("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateStatus = async (problem, status) => {
    try {
      setError("");
      setNotice("");

      const response = await fetch(`${API}/${problem._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Status update failed."
        );
      }

      setNotice("Problem status updated!");
      await fetchProblems();
    } catch (err) {
      setError(err.message || "Status update failed.");
    }
  };

  const deleteProblem = async (id) => {
    if (!window.confirm("Are you sure you want to delete this problem?")) {
      return;
    }

    try {
      setError("");
      setNotice("");

      const response = await fetch(`${API}/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Delete failed.");
      }

      if (editingId === id) {
        setEditingId(null);
        setForm(emptyForm);
      }

      setNotice("Problem deleted successfully!");
      await fetchProblems();
    } catch (err) {
      setError(err.message || "Delete failed.");
    }
  };

  // Login / Signup screen
  if (!token || !user) {
    return (
      <div className="app-shell auth-shell">
        <main className="auth-card">
          <a href="#" className="brand auth-brand">
            <span className="brand-icon">B</span>
            <span>
              BIYA
              <small>PROBLEM SOLVING</small>
            </span>
          </a>

          <p className="eyebrow">YOUR PERSONAL WORKSPACE</p>

          <h1>
            {authMode === "login"
              ? "Welcome Back"
              : "Create Your Account"}
          </h1>

          <p className="panel-description">
            {authMode === "login"
              ? "Log in to continue to your BIYA dashboard."
              : "Sign up to start managing your problems."}
          </p>

          <div className="auth-tabs">
            <button
              type="button"
              className={authMode === "login" ? "selected" : ""}
              onClick={() => {
                setAuthMode("login");
                setAuthError("");
                setNotice("");
              }}
            >
              Login
            </button>

            <button
              type="button"
              className={authMode === "signup" ? "selected" : ""}
              onClick={() => {
                setAuthMode("signup");
                setAuthError("");
                setNotice("");
              }}
            >
              Sign Up
            </button>
          </div>

          {authError && (
            <div className="alert alert-error">{authError}</div>
          )}

          {notice && (
            <div className="alert alert-success">{notice}</div>
          )}

          <form onSubmit={handleAuthSubmit}>
            {authMode === "signup" && (
              <>
                <label htmlFor="auth-name">Full name</label>
                <input
                  id="auth-name"
                  name="name"
                  value={authForm.name}
                  onChange={handleAuthChange}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  required
                  maxLength={100}
                />
              </>
            )}

            <label htmlFor="auth-email">Email address</label>
            <input
              id="auth-email"
              name="email"
              type="email"
              value={authForm.email}
              onChange={handleAuthChange}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />

            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              name="password"
              type="password"
              value={authForm.password}
              onChange={handleAuthChange}
              placeholder="At least 8 characters"
              autoComplete={
                authMode === "login"
                  ? "current-password"
                  : "new-password"
              }
              minLength={8}
              required
            />

            <button
              className="submit-button"
              type="submit"
              disabled={authLoading}
            >
              {authLoading
                ? "Please wait..."
                : authMode === "login"
                  ? "Login to BIYA →"
                  : "Create Account →"}
            </button>
          </form>

          <p className="auth-switch">
            {authMode === "login"
              ? "Don't have an account? "
              : "Already have an account? "}

            <button
              type="button"
              onClick={() => {
                setAuthMode(
                  authMode === "login" ? "signup" : "login"
                );
                setAuthError("");
                setNotice("");
              }}
            >
              {authMode === "login" ? "Sign up" : "Login"}
            </button>
          </p>

          <p className="sidebar-footer">
            BIYA SYSTEM · 2026
          </p>
        </main>
      </div>
    );
  }

  const filteredProblems = problems.filter((problem) => {
    const matchesSearch = [
      problem.title,
      problem.description,
      problem.category,
    ].some((value) =>
      value?.toLowerCase().includes(search.toLowerCase())
    );

    const matchesFilter =
      filter === "All" || problem.status === filter;

    return matchesSearch && matchesFilter;
  });

  const openCount = problems.filter(
    (p) => p.status === "Open"
  ).length;

  const progressCount = problems.filter(
    (p) => p.status === "In Progress"
  ).length;

  const resolvedCount = problems.filter(
    (p) => p.status === "Resolved"
  ).length;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a href="#dashboard" className="brand">
          <span className="brand-icon">B</span>
          <span>
            BIYA
            <small>PROBLEM SOLVING</small>
          </span>
        </a>

        <p className="side-label">WORKSPACE</p>

        <a className="nav-item active" href="#dashboard">
          <span>▦</span> Dashboard
        </a>

        <a className="nav-item" href="#new-problem">
          <span>＋</span> Submit a Problem
        </a>

        <a className="nav-item" href="#problems">
          <span>☷</span> All Problems
        </a>

        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-icon">✦</span>
            <h3>Every problem has a solution.</h3>
            <p>Organize your challenges. Track your progress.</p>
          </div>
          <p className="sidebar-footer">BIYA SYSTEM · 2026</p>
        </div>
      </aside>

      <main className="main-content" id="dashboard">
        <header className="topbar">
          <div>
            <p className="eyebrow">YOUR WORKSPACE</p>
            <h1>Problem Dashboard</h1>
            <p className="panel-description">
              Welcome, {user.name}!
            </p>
          </div>

          <div className="topbar-right">
            <span className="system-status">
              <span className="status-dot"></span>
              Problem Tracker
            </span>

            <div className="avatar">
              {user.name?.charAt(0).toUpperCase() || "B"}
            </div>

            <button
              className="cancel-button"
              type="button"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </header>

        <section className="welcome-banner">
          <div className="welcome-copy">
            <span className="welcome-tag">
              YOUR IDEAS. YOUR SOLUTIONS.
            </span>
            <h2>Turn challenges into progress.</h2>
            <p>
              Keep track of your problems, organize your thoughts,
              and move toward meaningful solutions.
            </p>
            <a href="#new-problem" className="primary-button">
              + Submit a Problem
            </a>
          </div>

          <div className="welcome-art" aria-hidden="true">
            <div className="art-ring ring-one"></div>
            <div className="art-ring ring-two"></div>
            <div className="art-center">✦</div>
            <div className="art-card art-card-one">✓ Organized</div>
            <div className="art-card art-card-two">↗ Progress</div>
          </div>
        </section>

        {error && <div className="alert alert-error">{error}</div>}
        {notice && <div className="alert alert-success">{notice}</div>}

        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-top">
              <span>Total Problems</span>
              <span className="stat-icon purple">▤</span>
            </div>
            <strong>{problems.length}</strong>
            <p>All recorded problems</p>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span>Open</span>
              <span className="stat-icon orange">◷</span>
            </div>
            <strong>{openCount}</strong>
            <p>Awaiting action</p>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span>In Progress</span>
              <span className="stat-icon blue">↗</span>
            </div>
            <strong>{progressCount}</strong>
            <p>Currently being handled</p>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span>Resolved</span>
              <span className="stat-icon green">✓</span>
            </div>
            <strong>{resolvedCount}</strong>
            <p>Successfully completed</p>
          </div>
        </section>

        <section className="content-grid">
          <div className="panel form-panel" id="new-problem">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">GET STARTED</p>
                <h2>
                  {editingId ? "Edit Problem" : "Submit a Problem"}
                </h2>
              </div>
              <span className="heading-icon">＋</span>
            </div>

            <p className="panel-description">
              Describe your challenge and the outcome you want.
            </p>

            <form onSubmit={handleSubmit}>
              <label htmlFor="title">Problem title *</label>
              <input
                id="title"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. Improve my study routine"
                required
                maxLength={150}
              />

              <label htmlFor="category">Category *</label>
              <select
                id="category"
                name="category"
                value={form.category}
                onChange={handleChange}
                required
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <label htmlFor="description">
                Problem description *
              </label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Explain the problem in detail..."
                rows={4}
                required
                maxLength={3000}
              />

              <label htmlFor="desiredOutcome">
                Desired outcome *
              </label>
              <textarea
                id="desiredOutcome"
                name="desiredOutcome"
                value={form.desiredOutcome}
                onChange={handleChange}
                placeholder="What solution are you looking for?"
                rows={3}
                required
                maxLength={2000}
              />

              <button
                className="submit-button"
                type="submit"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save Changes →"
                    : "Submit Problem →"}
              </button>

              {editingId && (
                <button
                  className="cancel-button"
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm(emptyForm);
                  }}
                >
                  Cancel Editing
                </button>
              )}
            </form>
          </div>

          <div className="panel problems-panel" id="problems">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">YOUR WORK</p>
                <h2>Recent Problems</h2>
              </div>
              <span className="count-badge">
                {filteredProblems.length}
              </span>
            </div>

            <div className="search-box">
              <span>⌕</span>
              <input
                aria-label="Search problems"
                placeholder="Search problems..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="filter-row">
              {["All", "Open", "In Progress", "Resolved"].map(
                (item) => (
                  <button
                    type="button"
                    key={item}
                    className={`filter-button ${
                      filter === item ? "selected" : ""
                    }`}
                    onClick={() => setFilter(item)}
                  >
                    {item}
                  </button>
                )
              )}
            </div>

            {loading ? (
              <div className="empty-state">
                <div className="empty-symbol">◌</div>
                <h3>Loading problems...</h3>
                <p>Please wait a moment.</p>
              </div>
            ) : filteredProblems.length === 0 ? (
              <div className="empty-state">
                <div className="empty-symbol">☷</div>
                <h3>No problems found</h3>
                <p>
                  {problems.length === 0
                    ? "Submit your first problem using the form."
                    : "Try another search or status filter."}
                </p>
              </div>
            ) : (
              <div className="problem-list">
                {filteredProblems.map((problem) => (
                  <article className="problem-item" key={problem._id}>
                    <div className="problem-item-top">
                      <span className="category-label">
                        {problem.category}
                      </span>
                      <span
                        className={`status-badge ${problem.status
                          .toLowerCase()
                          .replace(" ", "-")}`}
                      >
                        {problem.status}
                      </span>
                    </div>

                    <h3>{problem.title}</h3>
                    <p className="problem-description">
                      {problem.description}
                    </p>

                    <div className="outcome-box">
                      <strong>Desired outcome</strong>
                      <p>{problem.desiredOutcome}</p>
                    </div>

                    <label
                      className="status-label"
                      htmlFor={`status-${problem._id}`}
                    >
                      Update status
                    </label>
                    <select
                      id={`status-${problem._id}`}
                      value={problem.status}
                      onChange={(event) =>
                        updateStatus(problem, event.target.value)
                      }
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>

                    <div className="problem-actions">
                      <button
                        type="button"
                        onClick={() => editProblem(problem)}
                      >
                        ✎ Edit
                      </button>
                      <button
                        type="button"
                        className="delete-action"
                        onClick={() => deleteProblem(problem._id)}
                      >
                        × Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <footer className="page-footer">
          <span>© 2026 BIYA Problem Solving System</span>
          <span>Built for better problem management.</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
