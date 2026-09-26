// @vitest-environment node
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { migratedDatabase } from "./pglite";

/**
 * Follow-up migration 202609270001: proposal-outcome notifications, the admin-only
 * implementer link on creator profiles, and the commit-time Build indexing check.
 */
const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const admin = "33333333-3333-4333-8333-333333333333";
let t: Awaited<ReturnType<typeof migratedDatabase>>;
const asAdmin = () => t.as(admin, "authenticated", ["admin"]);

const stack = (buildId: string) => [{ id: `${buildId}-node`, productId: "tool", capabilityId: "cap", role: "Reasoning", notes: "", alternativeIds: [], evidence: "creator-confirmed", x: 0, y: 0 }];
const buildDoc = (id: string, useCaseIds: string[], extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    id, slug: id, name: `Build ${id} name`, tagline: "A tagline that is long enough", description: "A description that is comfortably longer than forty characters.",
    problem: "", intendedUsers: "", notes: "", ownerId: owner, creatorId: "owner-creator", visibility: "draft", publication: "draft", moderation: "pending", verification: "unverified",
    category: "ai-software", industry: "", demoUrl: "", githubUrl: "", sourceAvailable: false, cloneAllowed: false, commercialUseAllowed: false, license: "", attribution: "",
    buildTime: "", buildCost: "", currency: "USD", difficulty: "Intermediate", requirements: "", setupNotes: "", limitations: "", featured: false, ownershipConfirmed: true,
    createdAt: "2026-09-26T10:00:00Z", updatedAt: "2026-09-26T10:00:00Z", provenance: "creator supplied", stack: [], connections: [], media: [], sources: [], useCaseIds, capabilityIds: [], ...extra,
  }).replaceAll("'", "''");

beforeAll(async () => {
  t = await migratedDatabase();
  await t.db.exec(`insert into auth.users values('${owner}'),('${other}'),('${admin}');
    insert into public.categories(id,data,published) values('ai-software','{"name":"AI"}',true);
    insert into public.providers(id,data,published) values('vendor','{"name":"Vendor"}',true);
    insert into public.products(id,data,published) values('tool','{"name":"Tool","providerId":"vendor"}',true);
    insert into public.capabilities(id,data,published) values('cap','{"name":"Capability"}',true);
    insert into public.integrators(id,data,published) values('partner-9','{"name":"Partner Nine"}',true);
    insert into public.use_case_categories(id,slug,name,level,"parentId") values('finance','finance','Finance','category',null),('fin-ar','fin-ar','Accounts Receivable','subcategory','finance');
    insert into public.use_cases(id,data,published) values('chase','{"name":"Chase overdue invoices","slug":"chase","categoryId":"finance","subcategoryId":"fin-ar","status":"approved"}',true);
    insert into public.creator_profiles(id,slug,name,"ownerId") values('owner-creator','owner-creator','Owner Studio','${owner}');`);
}, 60000);
afterAll(async () => {
  await t.db.close();
});

describe("proposal outcome notifications", () => {
  it("tells only the proposer when a proposal is mapped, approved or rejected", async () => {
    await t.as(owner);
    for (const id of ["n1", "n2", "n3"]) {
      await t.db.exec(`select public.save_build('${buildDoc(id, [])}'::jsonb)`);
      await t.db.exec(`insert into public.use_case_proposals(id,"buildId","creatorId","originalText","suggestedTitle") values('p-${id}','${id}','owner-creator','reconcile card payouts ${id}','Reconcile card payouts ${id}')`);
    }
    await asAdmin();
    await t.db.exec(`select public.map_use_case_proposal('p-n1','chase','Same work')`);
    await t.db.exec(`select public.approve_use_case_proposal('p-n2','Reconcile card payouts weekly','Match processor payouts against bank deposits.','finance','fin-ar')`);
    await t.db.exec(`select public.reject_use_case_proposal('p-n3','Too close to an existing Use Case')`);
    await t.as(owner);
    const notes = await t.rows<{ name: string; body: string; href: string; read: boolean }>(
      `select data->>'name' as name, data->>'body' as body, data->>'href' as href, (data->>'read')::boolean as read from public.notifications order by id`,
    );
    expect(notes.map((note) => note.name).sort()).toEqual(["Use Case proposal approved", "Use Case proposal matched", "Use Case proposal not approved"]);
    expect(notes.find((note) => note.name === "Use Case proposal matched")).toMatchObject({ href: "/use-cases/chase", read: false });
    expect(notes.find((note) => note.name === "Use Case proposal matched")!.body).toContain("Moderator note: Same work");
    expect(notes.find((note) => note.name === "Use Case proposal not approved")).toMatchObject({ href: "/creator/builds/n3/edit" });
    expect(notes.find((note) => note.name === "Use Case proposal not approved")!.body).toContain("Too close to an existing Use Case");
    await t.as(other);
    expect(await t.rows("select id from public.notifications")).toHaveLength(0);
  });
  it("lets the proposer mark a notification read but not rewrite it", async () => {
    await t.as(owner);
    await t.db.exec(`update public.notifications set data = data || '{"read":true}' where id like 'notification-proposal-p-n1-%'`);
    expect((await t.rows<{ r: boolean }>(`select (data->>'read')::boolean r from public.notifications where id like 'notification-proposal-p-n1-%'`))[0].r).toBe(true);
    await expect(t.db.exec(`update public.notifications set data = data || '{"body":"forged"}' where id like 'notification-proposal-p-n1-%'`)).rejects.toThrow(/read state/);
  });
});

describe("Solution Provider fields", () => {
  it("lets a provider set their type but only an administrator link an implementer record", async () => {
    await t.as(owner);
    await t.db.exec(`update public.creator_profiles set "providerType"='Studio' where id='owner-creator'`);
    await expect(t.db.exec(`update public.creator_profiles set "providerType"='Wizard' where id='owner-creator'`)).rejects.toThrow();
    await expect(t.db.exec(`update public.creator_profiles set "integratorId"='partner-9' where id='owner-creator'`)).rejects.toThrow(/administrator/);
    await asAdmin();
    await t.db.exec(`update public.creator_profiles set "integratorId"='partner-9' where id='owner-creator'`);
    expect((await t.rows<{ i: string; p: string }>(`select "integratorId" i, "providerType" p from public.creator_profiles where id='owner-creator'`))[0]).toEqual({ i: "partner-9", p: "Studio" });
  });
});

describe("Build indexing is checked at commit", () => {
  it("accepts an approved Build saved together with its Use Case", async () => {
    await asAdmin();
    await t.db.exec(`select public.save_build('${buildDoc("idx1", ["chase"], { visibility: "public", publication: "published", moderation: "approved", stack: stack("idx1") })}'::jsonb)`);
    expect((await t.rows<{ m: string }>(`select moderation m from public.builds where id='idx1'`))[0].m).toBe("approved");
  });
  it("refuses an approved Build with no Use Case, and removing its last Use Case", async () => {
    await asAdmin();
    // save_build refuses it up front; the commit-time trigger catches direct updates too.
    await expect(t.db.exec(`select public.save_build('${buildDoc("idx2", [], { visibility: "public", publication: "published", moderation: "approved", stack: stack("idx2") })}'::jsonb)`)).rejects.toThrow(
      /Use Case/,
    );
    await t.as(owner);
    await t.db.exec(`select public.save_build('${buildDoc("idx3", [])}'::jsonb)`);
    await asAdmin();
    await expect(t.db.exec(`update public.builds set visibility='public', publication='published', moderation='approved' where id='idx3'`)).rejects.toThrow(/approved Use Case/);
    await expect(t.db.exec(`delete from public.build_use_cases where "buildId"='idx1'`)).rejects.toThrow(/approved Use Case/);
    expect(await t.rows(`select 1 from public.build_use_cases where "buildId"='idx1'`)).toHaveLength(1);
  });
});

describe("moderation: restore and label audit", () => {
  it("restores only archived Use Cases, and only for administrators", async () => {
    await asAdmin();
    await t.db.exec(`select public.archive_use_case('chase')`);
    await t.as(owner);
    await expect(t.db.exec(`select public.restore_use_case('chase')`)).rejects.toThrow(/administrator/);
    await asAdmin();
    await t.db.exec(`select public.restore_use_case('chase')`);
    expect((await t.rows<{ p: boolean; s: string }>(`select published p, status s from public.use_cases where id='chase'`))[0]).toEqual({ p: true, s: "approved" });
    await expect(t.db.exec(`select public.restore_use_case('chase')`)).rejects.toThrow(/archived/);
    expect((await t.rows(`select 1 from public.audit_events where "entityId"='chase' and action='restored'`)).length).toBe(1);
  });
  it("records every label change in the audit log", async () => {
    await asAdmin();
    await t.db.exec(`insert into public.use_case_aliases(id,name,"useCaseId",label,"aliasType","normalizedLabel") values('al-x','dunning','chase','dunning','hidden-search','dunning')`);
    await t.db.exec(`update public.use_case_aliases set label='dunning letters', "normalizedLabel"='dunning letters' where id='al-x'`);
    await t.db.exec(`delete from public.use_case_aliases where id='al-x'`);
    const actions = (await t.rows<{ a: string }>(`select action a from public.audit_events where "entityType"='use_case_aliases' order by at, action`)).map((row) => row.a);
    expect(actions).toEqual(expect.arrayContaining(["added label dunning (hidden-search)", "label dunning → dunning letters (hidden-search)", "removed label dunning letters"]));
    await t.as(owner);
    await expect(t.db.exec(`insert into public.use_case_aliases(id,name,"useCaseId",label,"aliasType","normalizedLabel") values('al-y','x','chase','xx','alternate','xx')`)).rejects.toThrow();
  });
});

describe("Technology Vendor claims", () => {
  const claim = (id: string, extra = "") =>
    `insert into public.provider_claims(id,name,"providerId","ownerId",evidence,domain,"contactEmail"${extra ? "," + extra.split("|")[0] : ""}) values('${id}','Claim','acme','${owner}','I run product marketing at Acme Corp.','acme.com','me@acme.com'${extra ? "," + extra.split("|")[1] : ""})`;
  it("requires the vendor's own domain and an email at it, and never lets the claimant self-verify", async () => {
    await t.asOwner();
    await t.db.exec(`insert into public.providers(id,data,published) values('acme','{"name":"Acme","website":"https://www.acme.com/products","description":"Acme tools"}',true)`);
    await t.as(owner);
    await t.db.exec(claim("c1"));
    const [{ token }] = await t.rows<{ token: string }>(`select "verificationToken" token from public.provider_claims where id='c1'`);
    expect(token).toMatch(/^[0-9a-f]{32}$/);
    await expect(t.db.exec(claim("c2").replace("'acme.com'", "'evil.com'"))).rejects.toThrow(/own domain/);
    await expect(t.db.exec(claim("c3").replace("'me@acme.com'", "'me@gmail.com'"))).rejects.toThrow(/work email/);
    await expect(t.db.exec(claim("c4", `"dnsResult","dnsVerifiedAt"|'verified',now()`))).rejects.toThrow(/reviewer/);
    await expect(t.db.exec(`update public.provider_claims set status='approved' where id='c1'`)).resolves.toBeDefined();
    expect((await t.rows<{ s: string }>(`select status s from public.provider_claims where id='c1'`))[0].s).toBe("pending");
  });
  it("approves only after a verified DNS check, then marks the listing claimed", async () => {
    await asAdmin();
    await expect(t.db.exec(`update public.provider_claims set status='approved' where id='c1'`)).rejects.toThrow(/provider_claim_approval_verified/);
    await t.db.exec(`update public.provider_claims set "dnsResult"='verified', "dnsCheckedAt"=now(), "dnsVerifiedAt"=now(), "dnsDetail"='Found' where id='c1'`);
    await t.db.exec(`update public.provider_claims set status='approved' where id='c1'`);
    const [{ listing }] = await t.rows<{ listing: { status: string; claimId: string; sources: unknown[] } }>(`select data->'listing' listing from public.providers where id='acme'`);
    expect(listing).toMatchObject({ status: "claimed", claimId: "c1" });
    expect(listing.sources).toHaveLength(1);
    expect((await t.rows(`select 1 from public.audit_events where "entityId"='c1' and "entityType"='provider_claims'`)).length).toBeGreaterThan(0);
  });
});
