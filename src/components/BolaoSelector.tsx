import { useApp } from '../contexts/AuthContext';
import type { Bolao } from '../types';

export function BolaoSelector() {
  const { boloes, activeBolao, setActiveBolao } = useApp();

  if (boloes.length <= 1) return null;

  return (
    <select
      value={activeBolao?.id || ''}
      onChange={(e) => {
        const bolao = boloes.find((b: Bolao) => b.id === e.target.value);
        if (bolao) setActiveBolao(bolao);
      }}
      className="px-2 py-1 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-green-500 max-w-[140px] truncate"
    >
      {boloes.map((b: Bolao) => (
        <option key={b.id} value={b.id}>
          {b.name}
        </option>
      ))}
    </select>
  );
}
