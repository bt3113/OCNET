import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, Check, Send } from "lucide-react";
import { useActions, useUI, useRecords } from "../state";
import { isSupabase } from "../data/repository";
import { Modal, Badge } from "./ui";
export const projectSchema = z.object({
  name: z.string().trim().min(5, "Use at least 5 characters.").max(120),
  description: z
    .string()
    .trim()
    .min(20, "Tell providers a little more (at least 20 characters).")
    .max(5000),
  category: z.string().min(1),
  budget: z.string().min(1),
  timeline: z.string().min(1),
});
export type ProjectInput = z.infer<typeof projectSchema>;
export function ProjectWizard() {
  const [step, setStep] = useState(0);
  const actions = useActions();
  const { notify } = useUI();
  const navigate = useNavigate();
  const { data: categories = [] } = useRecords("categories");
  const {
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "ai-software",
      budget: "To be discussed",
      timeline: "1–3 months",
    },
  });
  async function submit(data: ProjectInput) {
    const id = crypto.randomUUID();
    try {
      await actions.save("projects", {
        ...data,
        id,
        status: "open",
        capabilities: [],
        provenance: isSupabase ? "community supplied" : "demo",
        createdAt: new Date().toISOString(),
      });
      notify(
        isSupabase ? "Project created" : "Demo project created in this browser",
      );
      navigate("/app/projects/" + id);
    } catch {
      /* handled by actions */
    }
  }
  return (
    <div className="wizard">
      <div className="wizard-steps">
        {["Your outcome", "Scope & timing", "Review & post"].map((s, i) => (
          <div key={s} className={i <= step ? "active" : ""}>
            <span>{i < step ? <Check size={16} /> : i + 1}</span>
            {s}
          </div>
        ))}
      </div>
      <form className="card form-card" onSubmit={handleSubmit(submit)}>
        <Badge>
          {isSupabase
            ? "Project brief"
            : "Demo project · stored in this browser"}
        </Badge>
        {step === 0 ? (
          <>
            <h2>What are you trying to achieve?</h2>
            <p>
              Start with the outcome. You don’t need to know which technologies
              you need.
            </p>
            <label>
              Project title
              <input
                {...register("name")}
                placeholder="Create an AI product video website"
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <small className="field-error">{errors.name.message}</small>
              )}
            </label>
            <label>
              Your requirements
              <textarea
                {...register("description")}
                rows={5}
                placeholder="Describe the problem, who it is for, and what a successful result would look like."
                aria-invalid={!!errors.description}
              />
              {errors.description && (
                <small className="field-error">
                  {errors.description.message}
                </small>
              )}
            </label>
            <label>
              Primary category
              <select {...register("category")}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : step === 1 ? (
          <>
            <h2>Set a useful starting point</h2>
            <p>Your brief helps potential partners understand the scope.</p>
            <label>
              Budget range
              <select {...register("budget")}>
                {[
                  "To be discussed",
                  "Under $5,000",
                  "$5,000–$25,000",
                  "$25,000–$100,000",
                  "$100,000+",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              Target timeline
              <select {...register("timeline")}>
                {[
                  "Exploring options",
                  "Within a month",
                  "1–3 months",
                  "3–6 months",
                  "6+ months",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <div className="notice">
              No payment or financial information is collected.
            </div>
          </>
        ) : (
          <>
            <h2>Ready to start a conversation</h2>
            <h3>{watch("name")}</h3>
            <p className="preserve-lines">{watch("description")}</p>
            <dl className="detail-list">
              <div>
                <dt>Category</dt>
                <dd>{watch("category")}</dd>
              </div>
              <div>
                <dt>Budget</dt>
                <dd>{watch("budget")}</dd>
              </div>
              <div>
                <dt>Timeline</dt>
                <dd>{watch("timeline")}</dd>
              </div>
            </dl>
            <div className="notice">
              {isSupabase
                ? "Your project will be saved to your account."
                : "Demo mode: this creates a local project. No providers will be notified."}
            </div>
          </>
        )}
        <div className="row between form-actions">
          {step > 0 ? (
            <button
              type="button"
              className="button light"
              onClick={() => setStep(step - 1)}
            >
              <ArrowLeft size={16} />
              Back
            </button>
          ) : (
            <span />
          )}
          {step < 2 ? (
            <button
              key="continue"
              type="button"
              className="button dark"
              onClick={() =>
                void trigger(
                  step === 0
                    ? ["name", "description", "category"]
                    : ["budget", "timeline"],
                ).then((ok) => ok && setStep(step + 1))
              }
            >
              Continue
              <ArrowRight size={17} />
            </button>
          ) : (
            <button
              key="post"
              type="submit"
              className="button dark"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating…" : "Post project"}
              <ArrowRight size={17} />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
const contactSchema = z.object({
  name: z.string().trim().min(2),
  email: z.email(),
  body: z.string().trim().min(10, "Add at least 10 characters.").max(5000),
});
export function ProviderContactModal() {
  const { contact, setContact, notify } = useUI();
  const actions = useActions();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
  });
  async function submit(data: z.infer<typeof contactSchema>) {
    if (!contact) return;
    try {
      const id = crypto.randomUUID();
      await actions.save("message_threads", {
        id,
        name: contact.name,
        providerId: contact.id,
        participantIds: ["demo-user", contact.id],
        provenance: "demo",
      });
      await actions.save("messages", {
        id: crypto.randomUUID(),
        name: "Enquiry",
        threadId: id,
        senderId: "demo-user",
        body: data.body,
        sentAt: new Date().toISOString(),
        provenance: "demo",
      });
      await actions.save("leads", {
        id,
        name: data.name + " — " + contact.name,
        providerId: contact.id,
        description: data.body,
        status: "New",
        provenance: "demo",
      });
      reset();
      setContact(null);
      notify("Demo enquiry saved. No external message was sent.");
      navigate("/app/messages?thread=" + id);
    } catch {
      /* notification handled */
    }
  }
  return (
    <Modal
      open={!!contact}
      onClose={() => setContact(null)}
      title={"Contact " + (contact?.name ?? "provider")}
      description="Share a brief to start a useful conversation."
    >
      {isSupabase ? (
        <div className="notice">
          Provider routing requires verified provider membership. Use your
          project brief to prepare an enquiry; delivery is not enabled yet.
        </div>
      ) : (
        <form onSubmit={handleSubmit(submit)} className="form-stack">
          <div className="notice">
            Demo enquiry. Use sample details; no email is sent.
          </div>
          <label>
            Your name
            <input {...register("name")} autoComplete="name" />
            {errors.name && (
              <small className="field-error">Enter your name.</small>
            )}
          </label>
          <label>
            Email
            <input {...register("email")} type="email" autoComplete="email" />
            {errors.email && (
              <small className="field-error">Enter a valid email.</small>
            )}
          </label>
          <label>
            What would you like to discuss?
            <textarea {...register("body")} rows={4} />
            {errors.body && (
              <small className="field-error">{errors.body.message}</small>
            )}
          </label>
          <button className="button dark" disabled={isSubmitting}>
            <Send size={17} />
            {isSubmitting ? "Saving…" : "Save demo enquiry"}
          </button>
        </form>
      )}
    </Modal>
  );
}
export const simpleSchema = z.object({
  name: z.string().trim().min(2, "Enter at least 2 characters.").max(140),
  description: z.string().trim().max(5000),
});
export function SimpleForm({
  title,
  initial,
  onSubmit,
  submitLabel = "Save changes",
}: {
  title: string;
  initial?: { name: string; description: string };
  onSubmit: (data: z.infer<typeof simpleSchema>) => Promise<void>;
  submitLabel?: string;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof simpleSchema>>({
    resolver: zodResolver(simpleSchema),
    defaultValues: initial ?? { name: "", description: "" },
  });
  return (
    <form
      className="card form-card"
      onSubmit={handleSubmit(async (d) => {
        try {
          await onSubmit(d);
        } catch {
          /* caller shows error */
        }
      })}
    >
      <h2>{title}</h2>
      <label>
        Name
        <input {...register("name")} />
        {errors.name && (
          <small className="field-error">{errors.name.message}</small>
        )}
      </label>
      <label>
        Description
        <textarea {...register("description")} rows={5} />
      </label>
      <button className="button dark" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : submitLabel}
        <Check size={17} />
      </button>
    </form>
  );
}
