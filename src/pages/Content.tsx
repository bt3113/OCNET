import { Link, useLocation, useParams } from "react-router-dom";
import {
  ArrowRight,
  ShieldCheck,
  Search,
  Layers,
  Users,
  Mail,
} from "lucide-react";
import { useRecords, useUI, useActions } from "../state";
import { PageHeading } from "../components/layout";
import {
  Breadcrumbs,
  ButtonLink,
  Badge,
  EmptyState,
  CheckLine,
} from "../components/ui";
import { SimpleForm } from "../components/forms";
const copy: Record<
  string,
  { title: string; intro: string; sections: [string, string][] }
> = {
  about: {
    title: "Possibility starts with connection.",
    intro:
      "Oracnet is a neutral marketplace and discovery layer connecting business outcomes with technology and expertise.",
    sections: [
      [
        "Start with the outcome",
        "You should not need to know a vendor name to find a useful solution. Start with what you want to achieve, explore required capabilities, and understand how the pieces could fit together.",
      ],
      [
        "An open view of your options",
        "Discover products, providers, integrators, and consultants. Compare evidence and ask better questions before making a decision. Oracnet does not provide consulting or implementation services.",
      ],
      [
        "Designed for informed decisions",
        "Sample content is identified. Missing evidence is visible. A listing is not an endorsement, and a proposed stack is not a guarantee of compatibility.",
      ],
    ],
  },
  trust: {
    title: "Trust begins with clarity.",
    intro: "Useful decisions depend on knowing where information comes from.",
    sections: [
      [
        "Evidence over invented confidence",
        "We do not generate ratings, review counts, client testimonials, or deployment claims. Without reliable evidence, listings remain not yet rated or unverified.",
      ],
      [
        "Know the source",
        "Profiles support verified, vendor supplied, third-party sourced, community supplied, demo, and unverified provenance. Verification must be tied to a specific, reviewable claim.",
      ],
      [
        "Neutral discovery",
        "The demo uses a fixed discovery order. No supplier pays for position in this prototype. Any future commercial placement must be clearly disclosed.",
      ],
    ],
  },
  security: {
    title: "A considered foundation for trust.",
    intro:
      "Security is part of the architecture, from data access to deployment.",
    sections: [
      [
        "Your current demo",
        "This GitHub Pages prototype stores demo activity in your browser. It does not collect payments, use service-role keys, or send provider emails. Avoid entering confidential business information.",
      ],
      [
        "Production boundaries",
        "The Supabase architecture uses authentication, row-level security, private workspace records, and scoped storage. Administrative roles are assigned through trusted server-side controls.",
      ],
      [
        "Responsible reporting",
        "Security reports should include a reproducible description without sharing credentials or sensitive data. Use the contact page to prepare a report. This prototype does not provide a monitored security inbox.",
      ],
    ],
  },
  accessibility: {
    title: "Designed to be usable by everyone.",
    intro:
      "Our target is WCAG 2.2 AA, with accessible navigation and meaningful controls.",
    sections: [
      [
        "Navigate your way",
        "Use the skip link, visible keyboard focus, labeled forms, and keyboard-accessible dialogs. Open search with Command K or Control K.",
      ],
      [
        "Responsive by design",
        "The layout adapts to desktop, tablet, and mobile. Large touch controls and a mobile navigation bar keep essential actions close.",
      ],
      [
        "Motion and feedback",
        "Reduced-motion preferences are respected. Status messages are announced, and errors are shown near the relevant form fields. Automated checks support our review; they do not establish full conformance.",
      ],
    ],
  },
  privacy: {
    title: "Your information, explained.",
    intro: "This is the privacy notice for the Oracnet demo prototype.",
    sections: [
      [
        "Browser storage",
        "Saved items, comparisons, projects, messages, and preferences are kept in local storage on this device. Export or reset these records in workspace Settings.",
      ],
      [
        "External connections",
        "Links to official supplier websites leave Oracnet. External sites apply their own policies. No advertising or analytics tracking is configured in this prototype.",
      ],
      [
        "Production services",
        "If the operator enables Supabase mode, authenticated data is sent to the configured Supabase project. A production privacy notice, retention schedule, data processing agreements, and contact details must be established before a public service launch.",
      ],
    ],
  },
  terms: {
    title: "Terms for this prototype.",
    intro:
      "Oracnet is currently a demonstration environment for technology discovery.",
    sections: [
      [
        "Use of the demo",
        "Use sample information and evaluate the interface. Demo records do not create contracts, purchases, or obligations for providers.",
      ],
      [
        "Independent suppliers",
        "Providers are separate organizations. Confirm all features, licensing, pricing, security, and compatibility directly with a supplier before engagement.",
      ],
      [
        "Before a production launch",
        "Operator details, governing law, dispute procedures, and service terms require legal review before commercial launch. This page describes the current prototype and is not a finalized commercial agreement.",
      ],
    ],
  },
  cookies: {
    title: "Simple, transparent storage.",
    intro: "The demo does not use advertising cookies or analytics trackers.",
    sections: [
      [
        "Local storage",
        "The app uses browser storage to remember demo records and preferences. This persistence makes saved items, comparisons, and projects usable between visits.",
      ],
      [
        "Your controls",
        "Clear the demo data from Settings or your browser’s site-data controls. Export your records first if you want to keep them.",
      ],
      [
        "Connected mode",
        "Supabase mode stores authentication session tokens using its client SDK. Session handling and consent requirements must be reviewed for the production service.",
      ],
    ],
  },
  "marketplace-terms": {
    title: "A neutral place to discover.",
    intro:
      "The marketplace connects buyers with technology supply. It is not a consultancy or a contracting party to supplier engagements.",
    sections: [
      [
        "Listing accuracy",
        "Suppliers are responsible for substantiating their claims. The demo catalogue illustrates the interface and is not a verified directory.",
      ],
      [
        "Reviews and evidence",
        "Reviews require moderation before publication. A submitted record does not automatically establish a verified purchase, deployment, or identity.",
      ],
      [
        "Commercial engagement",
        "Discuss scope, contract terms, pricing, delivery, and support directly with your chosen provider. Live purchasing is intentionally absent from the GitHub Pages demo.",
      ],
    ],
  },
  press: {
    title: "The story behind Oracnet.",
    intro:
      "Technology discovery, organized around what businesses want to achieve.",
    sections: [
      [
        "Our mission",
        "Help businesses understand their options across AI, robotics, hardware, automation, data, and expert services.",
      ],
      [
        "About the product",
        "Oracnet connects business outcomes to use cases, capabilities, solution stacks, technologies, providers, and implementation partners.",
      ],
      [
        "Press enquiries",
        "The product is a working prototype. No funding announcements, customer figures, or market leadership claims are made. Use the contact page to prepare an enquiry.",
      ],
    ],
  },
  careers: {
    title: "Help make technology easier to discover.",
    intro:
      "Good products connect thoughtful design, clear information, and reliable engineering.",
    sections: [
      [
        "What we value",
        "Clarity, accessibility, honest evidence, and practical outcomes shape the product.",
      ],
      [
        "Opportunities",
        "There are no confirmed open positions listed in this prototype. We do not collect CVs or personal employment documents here.",
      ],
      [
        "Stay connected",
        "Use the contact page to prepare a general expression of interest. Demo submissions stay in your browser.",
      ],
    ],
  },
};
export default function Content() {
  const location = useLocation();
  const { slug } = useParams();
  const path = location.pathname.split("/")[1];
  const { data: articles = [] } = useRecords("articles");
  const { notify } = useUI();
  const actions = useActions();
  if (path === "updates" || path === "resources") {
    const item = articles.find((a) => a.slug === slug);
    if (slug && !item) return <EmptyState title="Article not found" />;
    return item ? (
      <>
        <Breadcrumbs
          items={[{ name: path, to: "/" + path }, { name: item.name }]}
        />
        <div className="article-detail">
          <Badge>{item.category} · Sample editorial</Badge>
          <PageHeading title={item.name} description={item.description} />
          <div className="article-cover">
            <Layers size={100} strokeWidth={1} />
          </div>
          <div className="prose card">
            {item.body.split("\n\n").map((p) => (
              <p key={p}>{p}</p>
            ))}
            <h2>Put the questions into practice</h2>
            <p>
              Explore a use case or start a project brief to make your
              requirements concrete.
            </p>
            <ButtonLink to="/use-cases">
              Explore use cases
              <ArrowRight size={17} />
            </ButtonLink>
          </div>
        </div>
      </>
    ) : (
      <>
        <PageHeading
          eyebrow="THE ORACNET EDIT"
          title={
            path === "updates"
              ? "Ideas from the ecosystem"
              : "A little clarity goes a long way."
          }
          description="Practical reading for better technology decisions. Sample editorial content for the demo."
        />
        <div className="grid three">
          {articles.map((a, i) => (
            <Link
              to={"/" + path + "/" + a.slug}
              className="card resource-card"
              key={a.id}
            >
              <div className={"resource-art art-" + i}>
                <Layers size={62} strokeWidth={1} />
              </div>
              <Badge>{a.category}</Badge>
              <h2>{a.name}</h2>
              <p>{a.description}</p>
              <span>
                Read the guide
                <ArrowRight size={17} />
              </span>
            </Link>
          ))}
        </div>
      </>
    );
  }
  if (path === "how-it-works")
    return (
      <>
        <PageHeading
          eyebrow="FROM IDEA TO ACTION"
          title="Start with your ambition. Find your way forward."
          description="Discover technology around the outcome you want, then connect with the people who can deliver it."
        />
        <div className="grid three">
          {[
            [
              Search,
              "01",
              "Tell us your outcome",
              "Explore a business use case or write your own project brief.",
            ],
            [
              Layers,
              "02",
              "Understand the capabilities",
              "Discover a sample solution stack and compare the suppliers for each piece.",
            ],
            [
              Users,
              "03",
              "Connect with expertise",
              "Talk to providers and implementation partners about scope, evidence, and delivery.",
            ],
          ].map(([I, n, title, body]) => {
            const Icon = I as typeof Search;
            return (
              <article key={String(n)} className="card process-card">
                <span className="category-icon sand">
                  <Icon />
                </span>
                <small>STEP {String(n)}</small>
                <h2>{String(title)}</h2>
                <p>{String(body)}</p>
              </article>
            );
          })}
        </div>
        <section className="bottom-banner">
          <h2>What will you build next?</h2>
          <ButtonLink to="/use-cases">
            Find your use case
            <ArrowRight size={17} />
          </ButtonLink>
        </section>
      </>
    );
  if (path === "pricing")
    return (
      <>
        <PageHeading
          eyebrow="START EXPLORING"
          title="Room for your next possibility."
          description="Try the full demo without a payment method. Production pricing has not been announced."
        />
        <div className="grid three">
          {[
            [
              "Discover",
              "For buyers exploring their options",
              [
                "Browse the catalogue",
                "Save technologies and partners",
                "Compare up to four products",
              ],
              "/explore",
              "Start exploring",
            ],
            [
              "Build",
              "For buyers shaping a project",
              [
                "Create project briefs",
                "Review sample proposals",
                "Try workspace messaging",
              ],
              "/app/projects/new",
              "Create a project",
            ],
            [
              "Connect",
              "For technology providers",
              [
                "Build a company profile",
                "Create sample listings",
                "Manage demo enquiries",
              ],
              "/provider",
              "Explore provider workspace",
            ],
          ].map(([name, description, features, path, label]) => (
            <article className="card pricing-card" key={String(name)}>
              <Badge>DEMO ACCESS</Badge>
              <h2>{String(name)}</h2>
              <p>{String(description)}</p>
              <strong className="price-label">Free to explore</strong>
              {(features as string[]).map((f) => (
                <CheckLine key={f}>{f}</CheckLine>
              ))}
              <ButtonLink to={String(path)}>
                {String(label)}
                <ArrowRight size={17} />
              </ButtonLink>
            </article>
          ))}
        </div>
        <div className="notice">
          No live payments, subscriptions, or financial details are collected.
        </div>
      </>
    );
  if (path === "contact")
    return (
      <>
        <PageHeading
          eyebrow="LET’S TALK"
          title="What can we help you with?"
          description="Prepare a product enquiry, support request, or feedback about the marketplace."
        />
        <div className="detail-columns">
          <SimpleForm
            title="Your message"
            submitLabel="Save demo enquiry"
            onSubmit={async (d) => {
              await actions.save("settings", {
                id: crypto.randomUUID(),
                ...d,
                provenance: "demo",
              });
              notify("Enquiry saved locally. No email was sent.");
            }}
          />
          <aside className="card side-card">
            <span className="category-icon sand">
              <Mail />
            </span>
            <h2>A note about this demo</h2>
            <p>
              Contact submissions are saved in this browser. A monitored support
              inbox is not connected.
            </p>
            <h3>Looking for a supplier?</h3>
            <p>
              Contact a technology provider from their profile to try the
              enquiry workflow.
            </p>
            <ButtonLink to="/technology-vendors" variant="light">
              Explore Technology Vendors
              <ArrowRight size={16} />
            </ButtonLink>
          </aside>
        </div>
      </>
    );
  const entry = copy[path];
  if (!entry)
    return (
      <EmptyState
        title="This page could not be found"
        description="Let’s get you back to something useful."
      />
    );
  return (
    <>
      <PageHeading
        eyebrow="ORACNET"
        title={entry.title}
        description={entry.intro}
      />
      <div className="editorial-layout">
        <article className="card prose">
          {entry.sections.map(([heading, body]) => (
            <section key={heading}>
              <h2>{heading}</h2>
              <p>{body}</p>
            </section>
          ))}
        </article>
        <aside className="card side-card">
          <span className="category-icon sand">
            <ShieldCheck />
          </span>
          <h3>Clarity, by design</h3>
          <p>
            Understand the source. Compare your options. Connect around a useful
            outcome.
          </p>
          <div className="account-links">
            {["about", "trust", "security", "privacy", "accessibility"]
              .filter((p) => p !== path)
              .map((p) => (
                <Link key={p} to={"/" + p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                  <ArrowRight size={16} />
                </Link>
              ))}
          </div>
        </aside>
      </div>
    </>
  );
}
