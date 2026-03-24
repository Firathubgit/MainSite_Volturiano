import React, { Suspense, lazy, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { NavBar } from "../components/NavBar/NavBar";
import { Route, Routes, Navigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useUserStore } from "../stores/userStore";
import { useUiStore } from "../stores/uiStore";
import { fetchProfile } from "../features/account/api";
import RequireAuth from "../features/account/RequireAuth";
import RequireAdmin from "../features/admin/components/RequireAdmin";
import NavDrawer from "../components/NavDrawer/NavDrawer";
import AgencyMenu from "../components/AgencyMenu/AgencyMenu";
import LoadingOverlay from "../components/LoadingOverlay/LoadingOverlay";
import { useRenderLogger } from "../debug/useRenderLogger";
import { usePageTitle } from "../hooks/usePageTitle";
import CustomCursor from "../components/CustomCursor/CustomCursor";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { PAUSE_MODE_ENABLED } from "../config/pauseMode";
import { BuilderAuthProvider } from "../contexts/BuilderAuthContext";
import { RouteTransitionProvider } from "../contexts/RouteTransitionContext";
import { RouteTransitionOverlay } from "../components/RouteTransitionOverlay/RouteTransitionOverlay";
import CookieConsent from "../components/CookieConsent/CookieConsent";

const Home = lazy(() => import("../pages/Home/Home"));
const Models = lazy(() => import("../pages/Models/Models"));
const Agency = lazy(() => import("../pages/Agency/Agency"));
const About = lazy(() => import("../pages/Agency/pages/About/About"));
const References = lazy(
  () => import("../pages/Agency/pages/References/References"),
);
const CaseStudy = lazy(
  () => import("../pages/Agency/pages/References/CaseStudy/CaseStudy"),
);
const Services = lazy(() => import("../pages/Agency/pages/Services/Services"));
const Booking = lazy(() => import("../pages/Agency/pages/Booking/Booking"));
const Builder = lazy(() => import("../pages/Agency/pages/Builder/Builder"));
const BuilderGeneration = lazy(
  () => import("../pages/Agency/pages/Builder/Generation/Generation"),
);
const BuilderAuthPage = lazy(() =>
  import("../pages/Agency/pages/Builder/components/AuthPage").then(
    (module) => ({ default: module.AuthPage }),
  ),
);
const BuilderNavBar = lazy(() =>
  import("../pages/Agency/pages/Builder/components/BuilderNavBar").then(
    (module) => ({ default: module.BuilderNavBar }),
  ),
);
const ProfileSettings = lazy(() =>
  import("../pages/Agency/pages/Builder/Dashboard/ProfileSettings"),
);
const CommunityHub = lazy(() =>
  import("../pages/Agency/pages/Builder/Community/CommunityHub"),
);
const ComponentStudio = lazy(() =>
  import("../pages/Agency/pages/Builder/Community/ComponentStudio"),
);
const Guidelines = lazy(() =>
  import("../pages/Agency/pages/Builder/Community/Guidelines"),
);
// Using new premium configurator - switch back to Configurator if needed
const Configurator = lazy(
  () => import("../pages/Configurator/ConfiguratorNew"),
);
const ConfiguratorFromGarage = lazy(
  () => import("../pages/Configurator/ConfiguratorFromGarage"),
);
const World = lazy(() => import("../pages/World/World"));
const Investor = lazy(() => import("../pages/Investor/Investor"));
const StartAnim = lazy(() => import("../pages/Start/StartAnim"));
const IndexGate = lazy(() => import("../pages/Start/IndexGate"));
const Login = lazy(() => import("../features/account/pages/Login"));
const Signup = lazy(() => import("../features/account/pages/Signup"));
const ForgotPassword = lazy(
  () => import("../features/account/pages/ForgotPassword"),
);
const Garage = lazy(() => import("../features/account/pages/Garage"));
const Profile = lazy(() => import("../features/account/pages/Profile"));
const VolturianoWorld = lazy(
  () => import("../features/account/pages/VolturianoWorld"),
);
const SharedGarageView = lazy(
  () => import("../features/garage/components/SharedGarageView"),
);
const AdminDashboard = lazy(() => import("../pages/Admin/Dashboard/Dashboard"));
const UserList = lazy(() => import("../pages/Admin/Users/UserList"));
const UserDetail = lazy(() => import("../pages/Admin/Users/UserDetail"));
const UserCreate = lazy(() => import("../pages/Admin/Users/UserCreate"));
const VehicleList = lazy(
  () => import("../pages/Admin/Content/Vehicles/VehicleList"),
);
const VehicleDetail = lazy(
  () => import("../pages/Admin/Content/Vehicles/VehicleDetail"),
);
const ManifestList = lazy(
  () => import("../pages/Admin/Manifests/ManifestList"),
);
const ManifestEditor = lazy(
  () => import("../features/admin/components/ManifestEditor/ManifestEditor"),
);
const OptionList = lazy(
  () => import("../pages/Admin/Content/Options/OptionList"),
);
const OptionDetail = lazy(
  () => import("../pages/Admin/Content/Options/OptionDetail"),
);
const OptionCreate = lazy(
  () => import("../pages/Admin/Content/Options/OptionCreate"),
);
const AnalyticsDashboard = lazy(
  () => import("../pages/Admin/Analytics/AnalyticsDashboard"),
);
const AuditLogs = lazy(() => import("../pages/Admin/Analytics/AuditLogs"));
const UserActivity = lazy(
  () => import("../pages/Admin/Analytics/UserActivity"),
);
const SystemSettings = lazy(
  () => import("../pages/Admin/Settings/SystemSettings"),
);
const RoleManagement = lazy(
  () => import("../pages/Admin/Settings/RoleManagement"),
);
const Infotainment = lazy(() => import("../pages/Infotainment/Infotainment"));
const PrivacyPolicy = lazy(() => import("../pages/Legal/PrivacyPolicy"));
const TermsOfService = lazy(() => import("../pages/Legal/TermsOfService"));
const LoadingOverlayTest = import.meta.env.DEV
  ? lazy(() => import("../pages/Debug/LoadingOverlayTest"))
  : null;
const RenderLogger = import.meta.env.DEV
  ? lazy(() => import("../pages/Debug/RenderLogger"))
  : null;
const TestSaveToGarage = import.meta.env.DEV
  ? lazy(() => import("../pages/Debug/TestSaveToGarage"))
  : null;

console.log(
  "[App] ===== APP COMPONENT MODULE LOADED =====",
  new Date().toISOString(),
);

export default function App() {
  console.log(
    "[App] ===== APP COMPONENT RENDERED =====",
    new Date().toISOString(),
  );

  const { t } = useTranslation("common");
  const setSession = useUserStore((state) => state.setSession);
  const setProfile = useUserStore((state) => state.setProfile);
  const setStatus = useUserStore((state) => state.setStatus);
  const reset = useUserStore((state) => state.reset);
  const status = useUserStore((state) => state.status);
  const session = useUserStore((state) => state.session);
  const forceOverlay = useUiStore((state) => state.forceOverlay);
  const platformMode = useUiStore((state) => state.platformMode);
  const exitPlatform = useUiStore((state) => state.exitPlatform);
  const location = useLocation();
  const [gdprConsent, setGdprConsent] = React.useState(() => {
    const saved = localStorage.getItem('volturiano_gdpr_consent');
    return saved ? JSON.parse(saved) : { analytics: false, performance: false };
  });

  useEffect(() => {
    const handleConsent = (e) => setGdprConsent(e.detail);
    window.addEventListener('gdpr-consent-updated', handleConsent);
    return () => window.removeEventListener('gdpr-consent-updated', handleConsent);
  }, []);

  // Set dynamic page title based on current route
  usePageTitle();

  // Auto-exit platform mode when user navigates TO an agency route (only on pathname change, not platformMode change)
  const prevPathnameRef = React.useRef(location.pathname);
  useEffect(() => {
    const prevPath = prevPathnameRef.current;
    prevPathnameRef.current = location.pathname;
    // Only exit when navigating FROM a non-agency route TO an agency route
    if (
      platformMode &&
      location.pathname.startsWith("/agency") &&
      !prevPath.startsWith("/agency")
    ) {
      exitPlatform();
    }
  }, [location.pathname, platformMode, exitPlatform]);

  console.log("[App] Current state:", {
    status,
    hasSession: !!session,
    sessionUserId: session?.user?.id,
    forceOverlay,
  });

  useRenderLogger("App", { status, hasSession: !!session, forceOverlay });

  useEffect(() => {
    if (import.meta.env.DEV) {
      import("../debug/checkSupabase")
        .then(({ runSupabaseDebugCheck }) => runSupabaseDebugCheck())
        .catch((err) => {
          console.error("Failed to run Supabase debug check:", err);
        });

      // Phase 1 status check (optional - uncomment to auto-run)
      // import('../debug/checkPhase1Status')
      //   .then(({ checkPhase1Status }) => checkPhase1Status())
      //   .catch((err) => {
      //     console.error('Failed to run Phase 1 status check:', err);
      //   });
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setStatus("ready");
      return undefined;
    }
    let active = true;

    const hydrateProfile = async (session) => {
      if (!active) return;
      if (session?.user?.id) {
        const { data, error } = await fetchProfile(session.user.id);
        if (!active) return;
        if (error) {
          console.warn("Failed to load profile", error.message);
          setProfile(null);
        } else {
          setProfile(data);
        }
      } else {
        setProfile(null);
      }
    };

    const handleSession = async (session) => {
      console.log("[App] handleSession called:", {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        active,
        timestamp: new Date().toISOString(),
      });

      if (!active) {
        console.log("[App] Component unmounted, skipping handleSession");
        return;
      }

      if (session) {
        console.log(
          "[App] Session present, setting session and hydrating profile",
        );
        setSession(session);
        await hydrateProfile(session);
      } else {
        console.log("[App] No session, resetting store");
        reset();
      }
      if (active) {
        console.log("[App] Setting status to ready");
        setStatus("ready");
      } else {
        console.log("[App] Component unmounted, not setting status");
      }
    };

    const initialise = async () => {
      setStatus("loading");
      console.log("[App] Initializing auth...");
      console.log("[App] Checking localStorage for session...");
      if (typeof window !== "undefined") {
        const storedSession = localStorage.getItem("sb-auth-token");
        console.log(
          "[App] Stored session in localStorage:",
          storedSession ? "Present" : "Missing",
        );
        if (storedSession) {
          try {
            const parsed = JSON.parse(storedSession);
            console.log("[App] Parsed stored session:", {
              hasAccessToken: !!parsed?.access_token,
              expiresAt: parsed?.expires_at,
              expiresIn: parsed?.expires_at
                ? Math.floor((parsed.expires_at * 1000 - Date.now()) / 1000)
                : null,
            });
          } catch (e) {
            console.error("[App] Could not parse stored session:", e);
          }
        }
      }

      const sessionResult = await supabase.auth.getSession();
      console.log("[App] getSession() result:", {
        hasData: !!sessionResult.data,
        hasSession: !!sessionResult.data?.session,
        hasUser: !!sessionResult.data?.session?.user,
        userId: sessionResult.data?.session?.user?.id,
        hasAccessToken: !!sessionResult.data?.session?.access_token,
        expiresAt: sessionResult.data?.session?.expires_at,
        expiresIn: sessionResult.data?.session?.expires_at
          ? Math.floor(
            (sessionResult.data.session.expires_at * 1000 - Date.now()) /
            1000,
          )
          : null,
        error: sessionResult.error?.message,
      });

      const sessionToHandle = sessionResult.data?.session;
      console.log("[App] About to handle session:", {
        hasSession: !!sessionToHandle,
        sessionUserId: sessionToHandle?.user?.id,
        timestamp: new Date().toISOString(),
      });
      await handleSession(sessionToHandle);
      console.log("[App] Session handling completed");
    };

    initialise();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("[App] Auth state change event:", {
          event,
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id,
          hasAccessToken: !!session?.access_token,
          expiresAt: session?.expires_at,
          expiresIn: session?.expires_at
            ? Math.floor((session.expires_at * 1000 - Date.now()) / 1000)
            : null,
        });

        // For sign out events, handle immediately without blocking
        // The stores are already cleared optimistically in AccountMenu
        if (event === "SIGNED_OUT") {
          console.log("[App] Handling SIGNED_OUT event");
          // Don't await - let it run in background to avoid blocking
          handleSession(session).catch((err) => {
            console.warn("[App] Error handling sign out session:", err);
          });
        } else {
          console.log("[App] Handling auth event:", event);
          setStatus("loading");
          await handleSession(session);
        }
      },
    );

    return () => {
      active = false;
      subscription?.subscription?.unsubscribe();
    };
  }, [setSession, setProfile, setStatus, reset]);

  // Toggle native cursor for builder pages
  useEffect(() => {
    if (location.pathname.startsWith("/builder") || location.pathname.startsWith("/community") || location.pathname.startsWith("/guidelines")) {
      document.body.classList.add("native-cursor");
    } else {
      document.body.classList.remove("native-cursor");
    }
  }, [location.pathname]);

  return (
    <BuilderAuthProvider>
      <RouteTransitionProvider>
        <div>
          <CookieConsent />
          {!location.pathname.startsWith("/builder") && !location.pathname.startsWith("/community") && !location.pathname.startsWith("/guidelines") && <CustomCursor />}
          {gdprConsent.analytics && <Analytics />}
          {gdprConsent.performance && <SpeedInsights />}
          <LoadingOverlay
            show={
              forceOverlay ||
              (!session && (status === "loading" || status === "idle"))
            }
          />
          {location.pathname !== "/builder/generation" && location.pathname !== "/builder/login" && location.pathname !== "/builder/profile" && location.pathname !== "/builder/privacy" && location.pathname !== "/builder/terms" && !location.pathname.startsWith("/community") && !location.pathname.startsWith("/guidelines") && (
            <>
              {(location.pathname.startsWith("/builder")) ? (
                <Suspense fallback={null}>
                  <BuilderNavBar />
                </Suspense>
              ) : (
                <NavBar />
              )}
              {PAUSE_MODE_ENABLED &&
                !platformMode &&
                !location.pathname.startsWith("/builder") ? (
                <AgencyMenu />
              ) : (
                !location.pathname.startsWith("/builder") && !location.pathname.startsWith("/community") && !location.pathname.startsWith("/guidelines") && <NavDrawer />
              )}
            </>
          )}
          <RouteTransitionOverlay />
          <main>
            <Suspense fallback={<LoadingOverlay />}>
              <Routes>
                <Route path="/" element={<IndexGate />} />
                <Route path="/start" element={<StartAnim />} />
                <Route path="/models" element={<Models />} />
                <Route path="/agency" element={<Agency />} />
                <Route path="/agency/about" element={<About />} />
                <Route path="/agency/references" element={<References />} />
                <Route
                  path="/agency/references/:projectId"
                  element={<CaseStudy />}
                />
                <Route path="/agency/services" element={<Services />} />
                <Route path="/agency/booking" element={<Booking />} />
                <Route path="/builder" element={<Builder />} />
                <Route path="/builder/generation" element={<BuilderGeneration />} />
                <Route path="/builder/login" element={<BuilderAuthPage />} />
                <Route path="/builder/profile" element={<ProfileSettings />} />
                <Route path="/builder/dashboard" element={<Navigate to="/builder/profile?tab=Websites" replace />} />
                <Route path="/builder/settings" element={<Navigate to="/builder/profile?tab=Settings" replace />} />
                <Route path="/community" element={<CommunityHub />} />
                <Route path="/community/studio" element={<ComponentStudio />} />
                <Route path="/guidelines" element={<Guidelines />} />
                <Route path="/infotainment" element={<Infotainment />} />
                <Route
                  path="/configurator/:garageItemId"
                  element={
                    <RequireAuth>
                      <ConfiguratorFromGarage />
                    </RequireAuth>
                  }
                />
                <Route path="/configurator" element={<Configurator />} />
                {import.meta.env.VITE_ENABLE_WORLD === "true" && (
                  <Route path="/world" element={<World />} />
                )}
                {import.meta.env.VITE_ENABLE_INVEST === "true" && (
                  <Route path="/investor" element={<Investor />} />
                )}
                <Route path="/account/login" element={<Login />} />
                <Route path="/account/signup" element={<Signup />} />
                <Route path="/builder/privacy" element={<PrivacyPolicy />} />
                <Route path="/builder/terms" element={<TermsOfService />} />
                <Route
                  path="/account/forgot-password"
                  element={<ForgotPassword />}
                />
                <Route
                  path="/garage"
                  element={
                    <RequireAuth>
                      <Garage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/garage/share/:shareCode"
                  element={<SharedGarageView />}
                />
                <Route
                  path="/account/world"
                  element={
                    <RequireAuth>
                      <VolturianoWorld />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/account/profile"
                  element={
                    <RequireAuth>
                      <Profile />
                    </RequireAuth>
                  }
                />
                {import.meta.env.DEV && LoadingOverlayTest && (
                  <Route
                    path="/debug/loading-overlay"
                    element={<LoadingOverlayTest />}
                  />
                )}
                {import.meta.env.DEV && RenderLogger && (
                  <Route path="/debug/render-logger" element={<RenderLogger />} />
                )}
                {import.meta.env.DEV && TestSaveToGarage && (
                  <Route path="/debug/test-save" element={<TestSaveToGarage />} />
                )}
                <Route
                  path="/admin"
                  element={
                    <RequireAdmin>
                      <AdminDashboard />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <RequireAdmin>
                      <UserList />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="/admin/users/create"
                  element={
                    <RequireAdmin>
                      <UserCreate />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="/admin/users/:userId"
                  element={
                    <RequireAdmin>
                      <UserDetail />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="/admin/content/vehicles"
                  element={
                    <RequireAdmin>
                      <VehicleList />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="/admin/content/vehicles/:vehicleId"
                  element={
                    <RequireAdmin>
                      <VehicleDetail />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="/admin/manifests"
                  element={
                    <RequireAdmin>
                      <ManifestList />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="/admin/manifests/:manifestId/edit"
                  element={
                    <RequireAdmin>
                      <ManifestEditor />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="/admin/content/options"
                  element={
                    <RequireAdmin>
                      <OptionList />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="/admin/content/options/create"
                  element={
                    <RequireAdmin>
                      <OptionCreate />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="/admin/content/options/:optionId"
                  element={
                    <RequireAdmin>
                      <OptionDetail />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="/admin/analytics"
                  element={
                    <RequireAdmin>
                      <AnalyticsDashboard />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="/admin/analytics/audit-logs"
                  element={
                    <RequireAdmin>
                      <AuditLogs />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="/admin/analytics/user-activity"
                  element={
                    <RequireAdmin>
                      <UserActivity />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="/admin/settings"
                  element={
                    <RequireAdmin requiredRole="super_admin">
                      <SystemSettings />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="/admin/settings/roles"
                  element={
                    <RequireAdmin requiredRole="super_admin">
                      <RoleManagement />
                    </RequireAdmin>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </RouteTransitionProvider>
    </BuilderAuthProvider>
  );
}
