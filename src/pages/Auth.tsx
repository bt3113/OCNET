import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { useUI, useActions } from "../state";
import { isSupabase } from "../data/repository";
import { Badge } from "../components/ui";
import type { Role } from "../data/model";
const schema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters.").max(128),
});
export default function Auth() {
  const path = useLocation().pathname;
  const onboarding = path === "/onboarding";
  const signup = path === "/sign-up";
  const forgot = path === "/forgot-password";
  const navigate = useNavigate();
  const { notify, setRole } = useUI();
  const actions = useActions();
  const [persona, setPersona] = useState<Role>("buyer");
  const [goal, setGoal] = useState("");
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(
      forgot ? schema.extend({ password: z.string() }) : schema,
    ),
    defaultValues: { email: "", password: "" },
  });
  async function submit(d: z.infer<typeof schema>) {
    try {
      if (isSupabase) {
        const { supabase } = await import("../data/supabase");
        const result = forgot
          ? await supabase.auth.resetPasswordForEmail(d.email, {
              redirectTo:
                window.location.origin + import.meta.env.BASE_URL + "sign-in",
            })
          : signup
            ? await supabase.auth.signUp({
                email: d.email,
                password: d.password,
              })
            : await supabase.auth.signInWithPassword(d);
        if (result.error) throw result.error;
        if (forgot || signup) {
          setDone(true);
          return;
        }
      } else if (forgot) {
        setDone(true);
        return;
      }
      notify(
        isSupabase
          ? "Signed in"
          : "Demo workspace opened. No credentials were stored.",
      );
      navigate(signup ? "/onboarding" : "/app");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Sign in failed. Try again.");
    }
  }
  return (
    <div className="auth-layout">
      <section className="auth-story">
        <div className="eyebrow">BUILD TOMORROW, TODAY</div>
        <h1>
          {onboarding
            ? "Your next chapter starts with an idea."
            : "The right technology. The right connections. More possibilities."}
        </h1>
        <p>
          Discover technologies and expert partners around what you want to
          achieve.
        </p>
        <div className="auth-benefits">
          <p>
            <Check />
            Explore solutions around your business outcome
          </p>
          <p>
            <Check />
            Save and compare technologies in one place
          </p>
          <p>
            <Check />
            Turn your requirements into a useful project brief
          </p>
        </div>
      </section>
      <section className="card auth-card">
        <Badge>{isSupabase ? "Secure account" : "Interactive demo"}</Badge>
        {done ? (
          <>
            <span className="category-icon sand">
              <ShieldCheck />
            </span>
            <h2>{isSupabase ? "Check your email" : "Demo flow complete"}</h2>
            <p>
              {isSupabase
                ? "If the address is eligible, an account email will be sent. Follow its instructions to continue."
                : "No email was sent and no password was stored. You can enter the demo workspace directly."}
            </p>
            <Link className="button dark" to="/app">
              Open workspace
              <ArrowRight size={17} />
            </Link>
          </>
        ) : onboarding ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setRole(persona);
              void actions
                .save("settings", {
                  id: "onboarding",
                  name: "Onboarding",
                  role: persona,
                  description: goal,
                  provenance: "demo",
                })
                .then(() => {
                  notify("Your workspace is ready");
                  navigate(
                    persona === "buyer"
                      ? "/app"
                      : persona === "creator"
                        ? "/creator"
                        : "/provider",
                  );
                })
                .catch(() => {});
            }}
          >
            <h2>Make Oracnet yours</h2>
            <p>Tell us a little about what brings you here.</p>
            <label>
              Choose your starting workspace
              <select
                value={persona}
                onChange={(e) => setPersona(e.target.value as Role)}
              >
                {[
                  "buyer",
                  "creator",
                  "provider",
                  "integrator",
                  "consultant",
                ].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label>
              What would you like to achieve?
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                required
                minLength={5}
                maxLength={1000}
                placeholder="Build a website for AI product videos…"
              />
            </label>
            <p className="muted">
              {isSupabase
                ? "You can buy and create with one account. Organization roles require approval before provider access is enabled."
                : "You can switch demo personas in Settings."}
            </p>
            <button className="button dark">
              Create my workspace
              <ArrowRight size={17} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit(submit)}>
            <h2>
              {forgot
                ? "Reset your password"
                : signup
                  ? "Create your account"
                  : "Welcome back"}
            </h2>
            <p>
              {forgot
                ? "Enter your email to request a reset link."
                : signup
                  ? "Start exploring what’s possible."
                  : "Continue turning ideas into possibilities."}
            </p>
            {!isSupabase && (
              <div className="notice">
                Demo mode. Use sample credentials; no authentication or email
                delivery takes place.
              </div>
            )}
            {!forgot && (
              <button
                type="button"
                className="button light"
                onClick={async () => {
                  if (!isSupabase) {
                    notify(
                      "GitHub sign-in requires a configured Supabase GitHub provider. Demo credentials are not requested.",
                    );
                    return;
                  }
                  const { supabase } = await import("../data/supabase");
                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: "github",
                    options: {
                      redirectTo:
                        window.location.origin +
                        import.meta.env.BASE_URL +
                        "creator",
                      scopes: "read:user user:email",
                    },
                  });
                  if (error) notify(error.message);
                }}
              >
                Sign in with GitHub
              </button>
            )}
            <label>
              Email address
              <input type="email" autoComplete="email" {...register("email")} />
              {errors.email && (
                <small className="field-error">{errors.email.message}</small>
              )}
            </label>
            {!forgot && (
              <label>
                Password
                <input
                  type="password"
                  autoComplete={signup ? "new-password" : "current-password"}
                  {...register("password")}
                />
                {errors.password && (
                  <small className="field-error">
                    {errors.password.message}
                  </small>
                )}
              </label>
            )}
            {!signup && !forgot && (
              <Link className="form-link" to="/forgot-password">
                Forgot password?
              </Link>
            )}
            <button disabled={isSubmitting} className="button dark">
              {isSubmitting
                ? "Please wait…"
                : forgot
                  ? "Request reset"
                  : signup
                    ? "Create account"
                    : "Sign in"}
              <ArrowRight size={17} />
            </button>
            <p>
              {signup ? "Already have an account? " : "New to Oracnet? "}
              <Link to={signup ? "/sign-in" : "/sign-up"}>
                {signup ? "Sign in" : "Create an account"}
              </Link>
            </p>
            {!isSupabase && (
              <Link className="button light" to="/app">
                Explore demo workspace
              </Link>
            )}
            <small>
              By continuing, review our <Link to="/terms">Terms</Link> and{" "}
              <Link to="/privacy">Privacy notice</Link>.
            </small>
          </form>
        )}
      </section>
    </div>
  );
}
