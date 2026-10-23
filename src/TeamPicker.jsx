import React, { useEffect, useState } from "react";

export function TeamPicker({ bridge, limit, busy, onInvite }) {
  const [people, setPeople] = useState([]);
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    bridge
      .call("collab.people")
      .then((result) => {
        if (active) setPeople(result.people);
      })
      .catch((error) => {
        if (active) setError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [bridge]);
  const visible = people.filter((p) =>
    p.name
      .toLocaleLowerCase()
      .includes(query.replace(/^@/, "").toLocaleLowerCase())
  );
  return (
    <div className="team-picker">
      <label className="inline-label" htmlFor="teammate-search">
        Find a teammate
      </label>
      <input
        id="teammate-search"
        autoFocus
        placeholder="Name or @name"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {loading ? (
        <p role="status">Loading teammates…</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : visible.length ? (
        <div className="teammate-list">
          {visible.map((person) => (
            <label className="teammate" key={person.id}>
              <input
                type="checkbox"
                checked={selected.includes(person.id)}
                disabled={
                  busy ||
                  (!selected.includes(person.id) && selected.length >= limit)
                }
                onChange={(e) =>
                  setSelected((ids) =>
                    e.target.checked
                      ? [...ids, person.id]
                      : ids.filter((id) => id !== person.id)
                  )
                }
              />
              <span className="teammate-avatar" aria-hidden="true">
                {person.name.trim().slice(0, 1)}
              </span>
              <span>{person.name}</span>
            </label>
          ))}
        </div>
      ) : (
        <p>
          {people.length
            ? "No matching teammates."
            : "No other teammates are available."}
        </p>
      )}
      <button
        className="primary"
        disabled={busy || !selected.length}
        onClick={() => onInvite(people.filter((p) => selected.includes(p.id)))}
      >
        {busy
          ? "Sending invitation…"
          : selected.length === 1
          ? `Invite ${people.find((p) => p.id === selected[0])?.name}`
          : `Invite${
              selected.length ? ` ${selected.length} teammates` : " teammates"
            }`}
      </button>
      <p>
        Their Join button opens this game and adds their seat. No code to copy.
      </p>
    </div>
  );
}
