import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeftIcon, AtSignIcon, LockIcon, MailIcon, Loader2Icon, CheckCircle2Icon, AlertCircleIcon, UserIcon } from "lucide-react";
import { AuthShader } from "./AuthShader";
import { useBuilderAuth } from "../../../../../contexts/BuilderAuthContext";
import logoImage from "../../../../../assets/Logo/TornadoLogo.png";
import s from "./AuthPage.module.css";

export function AuthPage() {
  const navigate = useNavigate();
  const {
    signInWithGoogle,
    signInWithGithub,
    signInWithEmail,
    signInWithPassword,
    signUpWithPassword,
    isAuthenticated,
    loading: authLoading,
    error: authError,
    clearError,
  } = useBuilderAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [authMode, setAuthMode] = useState("magic-link"); // "magic-link" | "password"
  const [isSignUp, setIsSignUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Redirect if already logged in
  React.useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate("/builder", { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    clearError();
    setSuccessMessage("");
    await signInWithGoogle();
    // OAuth will redirect, so no need to setIsSubmitting(false)
  };

  const handleGithubLogin = async () => {
    setIsSubmitting(true);
    clearError();
    setSuccessMessage("");
    await signInWithGithub();
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsSubmitting(true);
    clearError();
    setSuccessMessage("");

    try {
      if (authMode === "magic-link") {
        const { error } = await signInWithEmail(email);
        if (!error) {
          setSuccessMessage("Check your email for the login link!");
        }
      } else if (isSignUp) {
        if (password.length < 6) {
          clearError();
          setSuccessMessage("");
          setIsSubmitting(false);
          return;
        }
        const { error } = await signUpWithPassword(email, password, fullName);
        if (!error) {
          setSuccessMessage("Account created! Check your email to confirm.");
        }
      } else {
        const { error } = await signInWithPassword(email, password);
        if (!error) {
          navigate("/builder", { replace: true });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={s.authMain}>
      {/* Left side with the logo and cinematic shader */}
      <div className={s.leftPanel}>
        <AuthShader />
        <Link to="/" className={s.leftBrand}>
          <img src={logoImage} alt="Volturiano" className={s.leftBrandLogo} />
        </Link>

        <div className={s.testimonial}>
          <blockquote>
            <p className={s.testimonialQuote}>
              &ldquo;This Builder has helped me to save time and serve my
              clients faster than ever before. Real time rendering and premium
              components.&rdquo;
            </p>
            <footer className={s.testimonialAuthor}>
              ~ Firat Kaya, Agency Owner
            </footer>
          </blockquote>
        </div>
      </div>

      {/* Right side with the actual login form */}
      <div className={s.rightPanel}>
        {/* Abstract Gradient Background */}
        <div className={s.abstractGradient}>
          <div className={s.gradientOrb1} />
          <div className={s.gradientOrb2} />
          <div className={s.gradientOrb3} />
          <div className={s.gradientOrb4} />
        </div>

        {/* Ambient lighting */}
        <div className={s.ambientShade} aria-hidden="true">
          <div className={s.ambientShade1} />
          <div className={s.ambientShade2} />
          <div className={s.ambientShade3} />
        </div>

        {/* Back to Builder */}
        <Link to="/builder" className={s.backButton}>
          <ChevronLeftIcon size={16} />
          Builder Home
        </Link>

        <div className={s.formContainer}>
          {/* Mobile logo */}
          <Link to="/" className={s.mobileBrand}>
            <img src={logoImage} alt="Volturiano" className={s.mobileBrandLogo} />
            <span className={s.mobileBrandText}>Builder</span>
          </Link>

          <div className={s.heading}>
            <h1 className={s.headingTitle}>
              {isSignUp ? "Create Account" : "Welcome back"}
            </h1>
            <p className={s.headingSubtitle}>
              {isSignUp
                ? "Sign up for your Volturiano Builder account"
                : "Sign in to your Volturiano Builder account"}
            </p>
          </div>

          {/* Error Message */}
          {authError && (
            <div className={s.errorBanner}>
              <AlertCircleIcon size={16} />
              <span>{authError}</span>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className={s.successBanner}>
              <CheckCircle2Icon size={16} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Social Buttons */}
          <div className={s.socialButtons}>
            <button
              type="button"
              className={s.socialButton}
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
            >
              <GoogleIcon className={s.socialIcon} />
              Continue with Google
            </button>
            <button
              type="button"
              className={s.socialButton}
              onClick={handleGithubLogin}
              disabled={isSubmitting}
            >
              <GithubIcon className={s.socialIcon} />
              Continue with GitHub
            </button>
          </div>

          <div className={s.divider}>
            <div className={s.dividerLine} />
            <span className={s.dividerText}>OR EMAIL</span>
            <div className={s.dividerLine} />
          </div>

          {/* Auth Mode Toggle */}
          <div className={s.authModeToggle}>
            <button
              type="button"
              className={`${s.authModeBtn} ${authMode === "magic-link" ? s.authModeBtnActive : ""}`}
              onClick={() => { setAuthMode("magic-link"); clearError(); setSuccessMessage(""); }}
            >
              <MailIcon size={14} />
              Magic Link
            </button>
            <button
              type="button"
              className={`${s.authModeBtn} ${authMode === "password" ? s.authModeBtnActive : ""}`}
              onClick={() => { setAuthMode("password"); clearError(); setSuccessMessage(""); }}
            >
              <LockIcon size={14} />
              Password
            </button>
          </div>

          {/* Email Form */}
          <form className={s.emailForm} onSubmit={handleEmailSubmit}>
            <div className={s.emailInputGroup}>
              <div className={s.emailAddon}>
                <AtSignIcon size={16} />
              </div>
              <input
                type="email"
                placeholder="name@agency.com"
                className={s.emailInput}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>

            {authMode === "password" && isSignUp && (
              <div className={s.emailInputGroup} style={{ marginTop: '12px' }}>
                <div className={s.emailAddon}>
                  <UserIcon size={16} />
                </div>
                <input
                  type="text"
                  placeholder="Full Name"
                  className={s.emailInput}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
            )}

            {authMode === "password" && (
              <div className={s.emailInputGroup} style={{ marginTop: '12px' }}>
                <div className={s.emailAddon}>
                  <LockIcon size={16} />
                </div>
                <input
                  type="password"
                  placeholder={isSignUp ? "Create a password (min 6 chars)" : "Your password"}
                  className={s.emailInput}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  minLength={6}
                  required
                />
              </div>
            )}

            <button className={s.submitButton} type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2Icon size={16} className={s.spinnerIcon} /> Processing...</>
              ) : authMode === "magic-link" ? (
                "Send Magic Link"
              ) : isSignUp ? (
                "Create Account"
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Toggle Sign Up / Sign In */}
          {authMode === "password" && (
            <p className={s.toggleSignup}>
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                type="button"
                className={s.toggleSignupLink}
                onClick={() => { setIsSignUp(!isSignUp); clearError(); setSuccessMessage(""); }}
              >
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </p>
          )}

          <p className={s.terms}>
            By clicking continue, you agree to our{" "}
            <a className={s.termsLink} href="/terms">
              Terms of Service
            </a>{" "}
            and{" "}
            <a className={s.termsLink} href="/privacy">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}

const GoogleIcon = (props) => (
  <svg
    fill="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g>
      <path d="M12.479,14.265v-3.279h11.049c0.108,0.571,0.164,1.247,0.164,1.979c0,2.46-0.672,5.502-2.84,7.669   C18.744,22.829,16.051,24,12.483,24C5.869,24,0.308,18.613,0.308,12S5.869,0,12.483,0c3.659,0,6.265,1.436,8.223,3.307L18.392,5.62   c-1.404-1.317-3.307-2.341-5.913-2.341C7.65,3.279,3.873,7.171,3.873,12s3.777,8.721,8.606,8.721c3.132,0,4.916-1.258,6.059-2.401   c0.927-0.927,1.537-2.251,1.777-4.059L12.479,14.265z" />
    </g>
  </svg>
);

const GithubIcon = (props) => (
  <svg fill="currentColor" viewBox="0 0 1024 1024" {...props}>
    <path
      clipRule="evenodd"
      d="M8 0C3.58 0 0 3.58 0 8C0 11.54 2.29 14.53 5.47 15.59C5.87 15.66 6.02 15.42 6.02 15.21C6.02 15.02 6.01 14.39 6.01 13.72C4 14.09 3.48 13.23 3.32 12.78C3.23 12.55 2.84 11.84 2.5 11.65C2.22 11.5 1.82 11.13 2.49 11.12C3.12 11.11 3.57 11.7 3.72 11.94C4.44 13.15 5.59 12.81 6.05 12.6C6.12 12.08 6.33 11.73 6.56 11.53C4.78 11.33 2.92 10.64 2.92 7.58C2.92 6.71 3.23 5.99 3.74 5.43C3.66 5.23 3.38 4.41 3.82 3.31C3.82 3.31 4.49 3.1 6.02 4.13C6.66 3.95 7.34 3.86 8.02 3.86C8.7 3.86 9.38 3.95 10.02 4.13C11.55 3.09 12.22 3.31 12.22 3.31C12.66 4.41 12.38 5.23 12.3 5.43C12.81 5.99 13.12 6.7 13.12 7.58C13.12 10.65 11.25 11.33 9.47 11.53C9.76 11.78 10.01 12.26 10.01 13.01C10.01 14.08 10 14.94 10 15.21C10 15.42 10.15 15.67 10.55 15.59C13.71 14.53 16 11.53 16 8C16 3.58 12.42 0 8 0Z"
      fill="currentColor"
      fillRule="evenodd"
      transform="scale(64)"
    />
  </svg>
);
