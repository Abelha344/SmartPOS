const AuthLayout = ({ title, subtitle, children, footer }) => (
  <div className="auth-page">
    <div className="auth-page__glow auth-page__glow--left" />
    <div className="auth-page__glow auth-page__glow--right" />
    <div className="auth-card">
      <div className="auth-brand">
        <span className="auth-brand__badge">Smart POS</span>
        <h1>{title}</h1>
        {subtitle && <p className="auth-subtitle">{subtitle}</p>}
      </div>
      {children}
      {footer && <div className="auth-footer">{footer}</div>}
    </div>
  </div>
);

export default AuthLayout;
