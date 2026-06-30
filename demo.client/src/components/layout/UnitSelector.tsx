import { useState, useEffect, useRef } from 'react';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUnit } from '../../contexts/UnitContext';
import { cn } from '../../lib/utils';

export default function UnitSelector() {
  const { user } = useAuth();
  const { selectedUnitId, setSelectedUnitId } = useUnit();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Units come from the JWT — no extra API call needed
  const units = user?.units ?? [];

  // Auto-select when user belongs to exactly one unit
  useEffect(() => {
    if (units.length === 1 && !selectedUnitId) {
      setSelectedUnitId(units[0].unitId);
    }
  }, [units.length]);

  // Clear selection if the stored unit is no longer in the user's access list
  useEffect(() => {
    if (selectedUnitId && units.length > 0 && !units.find(u => u.unitId === selectedUnitId)) {
      setSelectedUnitId(null);
    }
  }, [units, selectedUnitId]);

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const showAllOption  = units.length > 1;
  const selectedUnit   = units.find(u => u.unitId === selectedUnitId);
  const label          = selectedUnit?.unitName ?? 'Todas as unidades';

  function select(id: string | null) {
    setSelectedUnitId(id);
    setOpen(false);
  }

  if (units.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-white/8 border border-white/12 text-white text-sm hover:bg-white/12 transition-colors"
      >
        <Building2 size={13} className="text-white/40 shrink-0" />
        <span className="flex-1 text-left truncate text-sm">{label}</span>
        <ChevronDown
          size={13}
          className={cn('text-white/35 shrink-0 transition-transform duration-150', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-1 z-50 rounded-md border border-white/15 shadow-xl overflow-hidden"
          style={{ backgroundColor: '#0a1f50' }}
        >
          {showAllOption && (
            <button
              onClick={() => select(null)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors',
                !selectedUnitId ? 'text-white bg-white/10' : 'text-white/55 hover:text-white hover:bg-white/5',
              )}
            >
              <span className="flex-1 text-left">Todas as unidades</span>
              {!selectedUnitId && <Check size={12} className="text-brand-gold" />}
            </button>
          )}

          {units.map(unit => (
            <button
              key={unit.unitId}
              onClick={() => select(unit.unitId)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors',
                selectedUnitId === unit.unitId
                  ? 'text-white bg-white/10'
                  : 'text-white/55 hover:text-white hover:bg-white/5',
              )}
            >
              <span className="flex-1 text-left">{unit.unitName}</span>
              <span className="text-[10px] text-white/30 shrink-0">{unit.roleName}</span>
              {selectedUnitId === unit.unitId && <Check size={12} className="text-brand-gold" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
