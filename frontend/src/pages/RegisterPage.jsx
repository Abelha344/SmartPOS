import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { useAuth } from "../context/AuthContext";

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    password_confirm: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (form.password !== form.password_confirm) {
      setError("Password confirmation does not match.");
      return;
    }
    setLoading(true);
    try {
      await register(form);
      setSuccess("Registration completed. Redirecting to login…");
      setTimeout(() => navigate("/login"), 900);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Register as a cashier and start processing sales securely."
      footer={
        <p>
          Already have access?{" "}
          <Link className="auth-link" to="/login">
            Sign in instead
          </Link>
        </p>
      }
    >
      <form className="auth-form" onSubmit={onSubmit}>
        <label className="auth-field">
          <span>Username</span>
          <input
            autoComplete="username"
            placeholder="Choose a username"
            value={form.username}
            onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
          />
        </label>
        <label className="auth-field">
          <span>Email</span>
          <input
            placeholder="you@company.com"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          />
        </label>
        <label className="auth-field">
          <span>Password</span>
          <input
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
          />
        </label>
        <label className="auth-field">
          <span>Confirm password</span>
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Repeat your password"
            value={form.password_confirm}
            onChange={(event) => setForm((prev) => ({ ...prev, password_confirm: event.target.value }))}
          />
        </label>
        {error && <p className="error-text auth-alert">{error}</p>}
        {success && <p className="success-text auth-alert">{success}</p>}
        <button className="auth-primary-btn" disabled={loading} type="submit">
          {loading ? "Creating account…" : "Create account"}
        </button>
        <Link className="auth-secondary-btn" to="/login">
          Back to sign in
        </Link>
      </form>
    </AuthLayout>
  );
};

export default RegisterPage;
