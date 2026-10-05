import { useStore } from '../state/store';
import { LocationIcon } from './icons';

export function UseMyLocationButton() {
  const { isLocating, locate } = useStore();

  return (
    <button
      type="button"
      onClick={() => void locate()}
      disabled={isLocating}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.07] px-3 py-2.5 text-sm font-medium text-white/85 backdrop-blur-xl hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <LocationIcon className="h-4 w-4" />
      <span>{isLocating ? 'Locating…' : 'Use my location'}</span>
    </button>
  );
}
