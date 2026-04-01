import { useEffect, useMemo, useRef, useState } from 'react';

export type MultiSelectOption = {
  id: number;
  label: string;
};

export function MultiSelect({
  options,
  valueIds,
  onChange,
  placeholder = 'Selecionar…',
  disabled = false,
  searchPlaceholder = 'Buscar',
  maxMenuHeightClass = 'max-h-60',
}: {
  options: MultiSelectOption[];
  valueIds: number[];
  onChange: (nextIds: number[]) => void;
  placeholder?: string;
  disabled?: boolean;
  searchPlaceholder?: string;
  maxMenuHeightClass?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  const normalizedValue = useMemo(
    () => [...new Set((valueIds ?? []).filter((n) => Number.isFinite(n) && n >= 1))].sort((a, b) => a - b),
    [valueIds]
  );

  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);

  const selectedLabels = useMemo(
    () => normalizedValue.map((id) => byId.get(id)?.label).filter(Boolean) as string[],
    [normalizedValue, byId]
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options;
    return options.filter((o) => o.label.toLowerCase().includes(s));
  }, [options, q]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (ev: MouseEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (ev.target instanceof Node && !el.contains(ev.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const toggle = (id: number) => {
    const set = new Set(normalizedValue);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onChange([...set].sort((a, b) => a - b));
  };

  const clear = () => onChange([]);

  const summary =
    selectedLabels.length > 0
      ? selectedLabels.length === 1
        ? selectedLabels[0]
        : `${selectedLabels.length} selecionados`
      : placeholder;

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((s) => !s)}
        className={[
          'w-full flex items-center justify-between gap-2 px-2 py-1 border rounded text-xs bg-white text-neutral-900',
          'border-neutral-300',
          disabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-neutral-400',
        ].join(' ')}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selectedLabels.length ? 'truncate' : 'truncate text-neutral-500'}>{summary}</span>
        <span className="text-neutral-500">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-neutral-200 bg-white shadow-lg">
          <div className="p-2 border-b border-neutral-100">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full px-2 py-1 border border-neutral-200 rounded text-xs"
              autoFocus
            />
          </div>

          <div className={`overflow-auto ${maxMenuHeightClass}`}>
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-xs text-neutral-500">Nenhum resultado</div>
            ) : (
              <ul className="py-1" role="listbox" aria-multiselectable="true">
                {filtered.map((o) => {
                  const checked = normalizedValue.includes(o.id);
                  return (
                    <li key={o.id} className="px-2">
                      <label className="flex items-center gap-2 px-2 py-1 rounded hover:bg-neutral-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(o.id)}
                          className="h-3.5 w-3.5"
                        />
                        <span className="text-xs text-neutral-900 truncate">{o.label}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="p-2 border-t border-neutral-100 flex items-center justify-between gap-2">
            <span className="text-[11px] text-neutral-500">
              {selectedLabels.length ? `${selectedLabels.length} selecionado(s)` : '— nenhum —'}
            </span>
            <button
              type="button"
              onClick={clear}
              className="text-[11px] text-neutral-600 hover:text-neutral-900 underline disabled:opacity-50"
              disabled={selectedLabels.length === 0}
            >
              Limpar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

