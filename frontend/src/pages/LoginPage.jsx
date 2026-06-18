import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import PasswordInput from "../components/PasswordInput";
import { useAuth } from "../context/AuthContext";

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form);
      navigate("/checkout");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to access your Smart POS terminal."
      footer={
        <p>
          New to Smart POS?{" "}
          <Link className="auth-link" to="/register">
            Create an account
          </Link>
        </p>
      }
    >
      <form className="auth-form" onSubmit={onSubmit}>
        <label className="auth-field">
          <span>Username or email</span>
          <input
            autoComplete="username"
            placeholder="Enter your username"
            value={form.username}
            onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
          />
        </label>
        <label className="auth-field">
          <span>Password</span>
          <PasswordInput
            autoComplete="current-password"
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            placeholder="Enter your password"
            value={form.password}
          />
        </label>
        {error && <p className="error-text auth-alert">{error}</p>}
        <button className="auth-primary-btn" disabled={loading} type="submit">
          {loading ? "Signing in…" : "Sign in"}
        </button>
        <Link className="auth-secondary-btn" to="/register">
          Create new account
        </Link>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;
