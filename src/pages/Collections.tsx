import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FolderPlus, Trash2 } from "lucide-react";
import { useActions, useRecords, useUI } from "../state";
import { PageHeading } from "../components/layout";
import { Badge, ButtonLink, EmptyState, Modal } from "../components/ui";
import { BuildCard, CollectionPicker } from "../components/builds/cards";
export default function Collections() {
  const { slug } = useParams();
  const { userId, notify } = useUI();
  const { data: collections = [] } = useRecords("collections");
  const { data: items = [] } = useRecords("collection_items");
  const { data: builds = [] } = useRecords("builds");
  const { data: allSaved = [] } = useRecords("saved_items");
  const saves = allSaved.filter((s) => !s.ownerId || s.ownerId === userId);
  const actions = useActions();
  const navigate = useNavigate();
  const [create, setCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [remove, setRemove] = useState(false);
  const c = collections.find(
    (c) =>
      c.slug === slug && (c.ownerId === userId || c.visibility === "public"),
  );
  const own = collections.filter((c) => c.ownerId === userId);
  async function createCollection() {
    if (!userId) {
      notify("Sign in to create collections.");
      return;
    }
    const id = crypto.randomUUID();
    try {
      await actions.save("collections", {
        id,
        slug: id,
        name: title.trim(),
        description: "",
        ownerId: userId,
        visibility: "private",
        provenance: "demo",
      });
      setCreate(false);
      setTitle("");
      navigate("/collections/" + id);
    } catch {
      /* handled */
    }
  }
  if (slug && !c)
    return (
      <EmptyState
        title="Collection not found"
        description="Private collections are visible only to their owner."
        to="/collections"
        action="Your collections"
      />
    );
  return (
    <>
      <PageHeading
        eyebrow="YOUR RESEARCH, CONNECTED"
        title={c?.name || "Your collections"}
        description={
          c?.description ||
          "Keep builds, technologies, use cases and stacks together. Private by default."
        }
        action={
          <button className="button dark" onClick={() => setCreate(true)}>
            <FolderPlus size={17} />
            New collection
          </button>
        }
      />
      {c ? (
        <>
          <div className="row wrap">
            <Badge>{c.visibility}</Badge>
            {c.ownerId === userId && (
              <>
                <form
                  className="row wrap"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    await actions.save("collections", {
                      ...c,
                      name: String(f.get("name")),
                    });
                    notify("Collection renamed");
                  }}
                >
                  <label>
                    Collection name
                    <input
                      name="name"
                      defaultValue={c.name}
                      required
                      minLength={3}
                      maxLength={80}
                    />
                  </label>
                  <button className="button light">Rename</button>
                </form>
                <button
                  className="button light"
                  onClick={() => setRemove(true)}
                >
                  Remove collection
                </button>
              </>
            )}
          </div>
          <div className="build-grid">
            {items
              .filter((i) => i.collectionId === c.id)
              .map((i) => {
                const b = builds.find((b) => b.id === i.entityId);
                return (
                  <div className="collected-item" key={i.id}>
                    {i.entityType === "builds" && b ? (
                      <BuildCard build={b} />
                    ) : (
                      <Link
                        className="card context-link"
                        to={
                          "/" +
                          (i.entityType === "products"
                            ? "technologies"
                            : i.entityType) +
                          "/" +
                          i.entityId
                        }
                      >
                        <Badge>{i.entityType}</Badge>
                        <h2>{i.name}</h2>Explore saved item →
                      </Link>
                    )}
                    {c.ownerId === userId && (
                      <div className="row wrap">
                        <CollectionPicker
                          entityId={i.entityId}
                          entityType={i.entityType}
                          name={i.name}
                        />
                        <label>
                          Move to
                          <select
                            aria-label={"Move " + i.name}
                            value=""
                            onChange={async (e) => {
                              if (!e.target.value) return;
                              const target = e.target.value;
                              const duplicate = items.some(
                                (x) =>
                                  x.collectionId === target &&
                                  x.entityId === i.entityId,
                              );
                              if (duplicate)
                                await actions.remove("collection_items", i.id);
                              else
                                await actions.save("collection_items", {
                                  ...i,
                                  collectionId: target,
                                });
                              notify("Item moved");
                            }}
                          >
                            <option value="">Select collection</option>
                            {own
                              .filter((x) => x.id !== c.id)
                              .map((x) => (
                                <option key={x.id} value={x.id}>
                                  {x.name}
                                </option>
                              ))}
                          </select>
                        </label>
                        <button
                          className="icon-button"
                          aria-label={"Remove " + i.name + " from collection"}
                          onClick={() =>
                            void actions.remove("collection_items", i.id)
                          }
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
          {!items.some((i) => i.collectionId === c.id) && (
            <EmptyState
              title="Room for your next discovery"
              description="Use Collect on a build or saved item to add it here."
              to="/builds"
              action="Discover builds"
            />
          )}
        </>
      ) : (
        <>
          <div className="grid three">
            {own.map((c) => (
              <Link
                className="card collection-card"
                key={c.id}
                to={"/collections/" + c.slug}
              >
                <FolderPlus size={28} />
                <h2>{c.name}</h2>
                <p>
                  {items.filter((i) => i.collectionId === c.id).length} saved
                  items · Private
                </p>
              </Link>
            ))}
          </div>
          {!own.length && (
            <EmptyState
              title="Organize your next idea"
              description="Create a private collection to connect builds and technologies."
              to="/builds"
              action="Explore builds"
            />
          )}
          <h2 className="subheading">Add from saved items</h2>
          {saves.map((s) => (
            <div className="card saved-row" key={s.id}>
              <strong>{s.name}</strong>
              <CollectionPicker
                entityId={s.entityId}
                entityType={s.entityType}
                name={s.name}
              />
            </div>
          ))}
          {!saves.length && (
            <p>Save a build or technology first, then collect it here.</p>
          )}
        </>
      )}
      <Modal
        open={create}
        onClose={() => setCreate(false)}
        title="Create a private collection"
        description="Give this research a useful name."
      >
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            void createCollection();
          }}
        >
          <label>
            Collection name
            <input
              required
              minLength={3}
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <button className="button dark">Create collection</button>
        </form>
      </Modal>
      <Modal
        open={remove}
        onClose={() => setRemove(false)}
        title="Remove this collection?"
        description="The collection and its membership will be removed. Your saved items and builds remain."
      >
        <button
          className="button dark"
          onClick={async () => {
            if (!c) return;
            for (const i of items.filter((i) => i.collectionId === c.id))
              await actions.remove("collection_items", i.id);
            await actions.remove("collections", c.id);
            setRemove(false);
            navigate("/collections");
            notify("Collection removed");
          }}
        >
          Remove collection
        </button>
        <ButtonLink to="/collections" variant="light">
          Keep researching
        </ButtonLink>
      </Modal>
    </>
  );
}
