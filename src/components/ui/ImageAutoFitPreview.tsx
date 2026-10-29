import { useState, useEffect } from 'react';
import { Image as ImageIcon, CheckCircle2, AlertCircle, Eye, Sparkles, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ImageAutoFitPreviewProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
  category?: string;
}

// Curated high-resolution, fast-loading, verified sacred images
export const CURATED_POOJA_IMAGES = [
  {
    name: 'Griha Pravesh & Hawan',
    category: 'Vedic Rituals',
    url: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Satyanarayan Katha',
    category: 'Blessings & Prosperity',
    url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Rudrabhishek (Lord Shiva)',
    category: 'Shiva Pooja',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Mahalakshmi & Diwali',
    category: 'Wealth & Abundance',
    url: 'https://images.unsplash.com/photo-1605371924599-2d0365da1ae0?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Ganesh Chaturthi Pooja',
    category: 'Auspicious Start',
    url: 'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Navagraha Shanti',
    category: 'Planetary Blessings',
    url: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Vastu & Mandir Diya',
    category: 'Harmony',
    url: 'https://images.unsplash.com/photo-1621847468516-1ed5d0df56fe?auto=format&fit=crop&w=800&q=80',
  },
];

export function ImageAutoFitPreview({
  value,
  onChange,
  label = 'Image URL',
  placeholder = 'https://images.unsplash.com/…',
}: ImageAutoFitPreviewProps) {
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>('cover');
  const [loadStatus, setLoadStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [showPresets, setShowPresets] = useState(false);

  useEffect(() => {
    if (!value || value.trim() === '') {
      setLoadStatus('idle');
      return;
    }
    setLoadStatus('loading');
  }, [value]);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="label mb-0">{label}</label>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setShowPresets(!showPresets)}
            className="flex items-center gap-1 font-medium text-saffron-600 hover:text-saffron-700 dark:text-saffron-400"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {showPresets ? 'Hide Curated' : 'Pick Curated Image'}
          </button>
        </div>
      </div>

      <div className="relative">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="input pr-10 text-xs sm:text-sm font-mono"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            title="Clear image URL"
          >
            ×
          </button>
        )}
      </div>

      {/* Preset Picker */}
      {showPresets && (
        <div className="rounded-xl border border-saffron-200/80 bg-saffron-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/60 animate-fade-in">
          <p className="mb-2 text-xs font-semibold text-saffron-900 dark:text-saffron-200">
            Select a verified high-resolution Pooja image:
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CURATED_POOJA_IMAGES.map((img) => (
              <button
                key={img.name}
                type="button"
                onClick={() => {
                  onChange(img.url);
                  setShowPresets(false);
                }}
                className={cn(
                  'flex items-center gap-2 rounded-lg border p-1.5 text-left transition',
                  value === img.url
                    ? 'border-saffron-500 bg-saffron-100 dark:bg-saffron-900/30 ring-1 ring-saffron-500'
                    : 'border-saffron-200 bg-white hover:border-saffron-300 dark:border-slate-700 dark:bg-slate-800'
                )}
              >
                <img
                  src={img.url}
                  alt={img.name}
                  className="h-9 w-9 shrink-0 rounded object-cover"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium text-slate-800 dark:text-slate-200">{img.name}</p>
                  <p className="truncate text-[9.5px] text-slate-500">{img.category}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Auto-Sit & Fit Live Preview Container */}
      <div className="rounded-xl border border-saffron-200/80 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
            <Eye className="h-3.5 w-3.5 text-saffron-500" />
            Auto Sit & Fit Preview (16:9 Card Aspect)
          </span>

          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-saffron-200/60 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setFitMode('cover')}
              className={cn(
                'rounded px-2 py-0.5 text-[10px] font-semibold transition',
                fitMode === 'cover'
                  ? 'bg-saffron-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
              )}
            >
              Cover (Fill)
            </button>
            <button
              type="button"
              onClick={() => setFitMode('contain')}
              className={cn(
                'rounded px-2 py-0.5 text-[10px] font-semibold transition',
                fitMode === 'contain'
                  ? 'bg-saffron-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
              )}
            >
              Contain (Full)
            </button>
          </div>
        </div>

        {/* Visual Box */}
        <div className="relative aspect-[16/9] w-full max-h-48 overflow-hidden rounded-lg border border-slate-200/80 bg-slate-100 shadow-inner dark:border-slate-800 dark:bg-slate-950 flex items-center justify-center">
          {value ? (
            <>
              <img
                src={value}
                alt="Live preview"
                className={cn(
                  'h-full w-full transition-all duration-300',
                  fitMode === 'cover' ? 'object-cover' : 'object-contain'
                )}
                onLoad={() => setLoadStatus('success')}
                onError={() => setLoadStatus('error')}
              />

              {loadStatus === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-xs dark:bg-slate-950/70">
                  <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-saffron-500" />
                    Fitting image…
                  </div>
                </div>
              )}

              {loadStatus === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-vermillion-50/90 p-4 text-center dark:bg-slate-900/90">
                  <AlertCircle className="h-8 w-8 text-vermillion-500 mb-1" />
                  <p className="text-xs font-semibold text-vermillion-700 dark:text-vermillion-400">
                    Unable to load image from URL
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Check URL address or pick one from curated list above.
                  </p>
                </div>
              )}

              {loadStatus === 'success' && (
                <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-emerald-600/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-xs backdrop-blur-xs">
                  <CheckCircle2 className="h-3 w-3" /> Auto-fit OK ({fitMode})
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-1 text-slate-400 dark:text-slate-600">
              <ImageIcon className="h-8 w-8 stroke-[1.5]" />
              <p className="text-xs font-medium">No image URL specified</p>
              <p className="text-[10px]">Default sacred pooja flame icon will be displayed</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
