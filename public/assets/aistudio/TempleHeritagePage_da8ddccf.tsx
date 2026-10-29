import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Landmark,
  ExternalLink,
  Sparkles,
  Maximize2,
  Minimize2,
  RotateCw,
  MapPin,
  CalendarHeart,
  Flame,
  Compass,
  ArrowRight,
  ShieldCheck,
  Eye,
  Share2,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { useToast } from '../context/ToastContext';
import { cn } from '../lib/utils';

interface HeritageTemple {
  id: string;
  name: string;
  deity: string;
  category: 'Jyotirlinga' | 'Char Dham' | 'Architectural Wonder';
  location: string;
  state: string;
  era: string;
  architecture: string;
  description: string;
  imageUrl: string;
  suggestedPoojaId?: string;
  suggestedPoojaName?: string;
}

const HERITAGE_TEMPLES: HeritageTemple[] = [
  {
    id: 'kashi-vishwanath',
    name: 'Kashi Vishwanath Temple',
    deity: 'Lord Shiva (Vishveshvara)',
    category: 'Jyotirlinga',
    location: 'Varanasi',
    state: 'Uttar Pradesh',
    era: 'Ancient (Rebuilt 1780 by Ahilyabai Holkar)',
    architecture: 'Nagara Style with Gold Plated Shikharas',
    description: 'Standing on the western bank of the sacred Ganga, Kashi Vishwanath is one of the twelve Jyotirlingas. Moksha is believed to be attained here.',
    imageUrl: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=800&q=80',
    suggestedPoojaId: 's-3',
    suggestedPoojaName: 'Rudrabhishek Pooja',
  },
  {
    id: 'kedarnath-dham',
    name: 'Kedarnath Temple',
    deity: 'Lord Shiva (Sadashiva)',
    category: 'Jyotirlinga',
    location: 'Rudraprayag (Garhwal Himalayas)',
    state: 'Uttarakhand',
    era: '8th Century CE (Adi Shankaracharya)',
    architecture: 'Katyuri Style Granite Stone Shrine',
    description: 'Perched at 3,583 meters amidst snow-clad peaks near the Mandakini River, Kedarnath is the highest of the 12 Jyotirlingas and part of Chota Char Dham.',
    imageUrl: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80',
    suggestedPoojaId: 's-3',
    suggestedPoojaName: 'Maha Mrityunjaya Japa',
  },
  {
    id: 'meenakshi-amman',
    name: 'Meenakshi Sundareswarar Temple',
    deity: 'Goddess Meenakshi (Parvati) & Lord Sundareswarar (Shiva)',
    category: 'Architectural Wonder',
    location: 'Madurai',
    state: 'Tamil Nadu',
    era: '6th Century BCE / Expanded 16th Century Nayakas',
    architecture: 'Dravidian Architecture with 14 Soaring Gopurams',
    description: 'Renowned for its towering multi-tiered gopurams adorned with thousands of colorful mythological stucco sculptures and the Hall of Thousand Pillars.',
    imageUrl: 'https://images.unsplash.com/photo-1605371924599-2d0365da1ae0?auto=format&fit=crop&w=800&q=80',
    suggestedPoojaId: 's-4',
    suggestedPoojaName: 'Mahalakshmi & Devi Pooja',
  },
  {
    id: 'konark-sun-temple',
    name: 'Konark Sun Temple',
    deity: 'Surya (Sun God)',
    category: 'Architectural Wonder',
    location: 'Konark, Puri District',
    state: 'Odisha',
    era: '13th Century CE (King Narasimhadeva I)',
    architecture: 'Kalinga Architecture Chariot with 24 Carved Wheels',
    description: 'Designed in the shape of a colossal chariot drawn by seven horses, this UNESCO World Heritage Site features sun-dial wheels that calculate time to the second.',
    imageUrl: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=800&q=80',
    suggestedPoojaId: 's-6',
    suggestedPoojaName: 'Navgrah Shanti Pooja',
  },
  {
    id: 'brihadeeswarar-temple',
    name: 'Brihadeeswarar Temple (Big Temple)',
    deity: 'Lord Shiva (Brihadisvara)',
    category: 'Architectural Wonder',
    location: 'Thanjavur',
    state: 'Tamil Nadu',
    era: '1010 CE (Raja Raja Chola I)',
    architecture: 'Apex of Dravidian Chola Architecture',
    description: 'Constructed entirely from granite, this Great Living Chola Temple features a massive 66-meter Vimana and an 80-tonne monolithic granite cupola cap.',
    imageUrl: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80',
    suggestedPoojaId: 's-3',
    suggestedPoojaName: 'Rudrabhishek Pooja',
  },
  {
    id: 'somnath-jyotirlinga',
    name: 'Somnath Temple',
    deity: 'Lord Shiva (Somnath - Lord of the Moon)',
    category: 'Jyotirlinga',
    location: 'Prabhas Patan, Veraval',
    state: 'Gujarat',
    era: 'Ancient (Reconstructed 1951 by Sardar Patel)',
    architecture: 'Chalukya / Kailash Mahameru Prasad Style',
    description: 'The first among the twelve Jyotirlingas, located on the shore of the Arabian Sea. The temple arrow pillar points uninterrupted south all the way to Antarctica.',
    imageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
    suggestedPoojaId: 's-3',
    suggestedPoojaName: 'Somwar Rudrabhishek',
  },
  {
    id: 'jagannath-puri',
    name: 'Shree Jagannath Temple',
    deity: 'Lord Jagannath (Vishnu/Krishna), Balabhadra & Subhadra',
    category: 'Char Dham',
    location: 'Puri',
    state: 'Odisha',
    era: '12th Century CE (King Anantavarman Chodaganga)',
    architecture: 'Kalinga Architecture with Sacred Nilachakra',
    description: 'One of the four sacred Char Dham abodes, famous for the worldwide Ratha Yatra and the world\'s largest kitchen (Rosha Ghara) preparing Mahaprasad.',
    imageUrl: 'https://images.unsplash.com/photo-1621847468516-1ed5d0df56fe?auto=format&fit=crop&w=800&q=80',
    suggestedPoojaId: 's-2',
    suggestedPoojaName: 'Shri Satyanarayan Katha',
  },
  {
    id: 'tirupati-balaji',
    name: 'Tirumala Venkateswara Temple',
    deity: 'Lord Venkateswara (Balaji / Govinda)',
    category: 'Char Dham',
    location: 'Tirumala, Tirupati',
    state: 'Andhra Pradesh',
    era: '300 CE (Pallavas, Cholas, Vijayanagara Patrons)',
    architecture: 'Dravidian Style with Ananda Nilayam Golden Gopuram',
    description: 'The sacred hill abode in the Seshachalam ranges where Kaliyuga Vaikuntha resides, receiving millions of devotees from around the world for divine darshan.',
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    suggestedPoojaId: 's-2',
    suggestedPoojaName: 'Kalyanotsavam & Satyanarayan',
  },
];

export function TempleHeritagePage() {
  const navigate = useNavigate();
  const { success } = useToast();
  const [activeTab, setActiveTab] = useState<'portal' | 'all' | 'jyotirlinga' | 'char-dham' | 'architecture'>('portal');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const filteredTemples = HERITAGE_TEMPLES.filter((temple) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'jyotirlinga') return temple.category === 'Jyotirlinga';
    if (activeTab === 'char-dham') return temple.category === 'Char Dham';
    if (activeTab === 'architecture') return temple.category === 'Architectural Wonder';
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="India Temple Heritage Portal"
        description="Experience the eternal sanctity, timeless architecture, and spiritual majesty of Bharat's most venerated temples."
        actions={
          <div className="flex items-center gap-2">
            <a
              href="https://india-temple-heritage-portal-three.vercel.app/#/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs flex items-center gap-1.5 shadow-soft transition hover:scale-[1.02]"
            >
              <ExternalLink className="h-3.5 w-3.5 text-saffron-600" />
              Open Live Portal
            </a>
            <button
              onClick={() => navigate('/app/services')}
              className="btn-primary text-xs flex items-center gap-1.5 shadow-soft transition hover:scale-[1.02]"
            >
              <CalendarHeart className="h-3.5 w-3.5" />
              Book Temple Pooja
            </button>
          </div>
        }
      />

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin pb-1">
        <button
          onClick={() => setActiveTab('portal')}
          className={cn(
            'flex items-center gap-2 shrink-0 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200',
            activeTab === 'portal'
              ? 'bg-gradient-to-r from-saffron-600 to-vermillion-600 text-white shadow-soft ring-2 ring-saffron-500/30'
              : 'border border-saffron-200 bg-white text-saffron-900 hover:bg-saffron-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
          )}
        >
          <Compass className="h-4 w-4 animate-spin-slow" />
          Interactive 3D Heritage Portal
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={cn(
            'shrink-0 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200',
            activeTab === 'all'
              ? 'bg-saffron-600 text-white shadow-soft'
              : 'border border-saffron-200 bg-white text-saffron-900 hover:bg-saffron-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
          )}
        >
          All Temples ({HERITAGE_TEMPLES.length})
        </button>

        <button
          onClick={() => setActiveTab('jyotirlinga')}
          className={cn(
            'shrink-0 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200',
            activeTab === 'jyotirlinga'
              ? 'bg-saffron-600 text-white shadow-soft'
              : 'border border-saffron-200 bg-white text-saffron-900 hover:bg-saffron-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
          )}
        >
          🕉️ 12 Jyotirlingas
        </button>

        <button
          onClick={() => setActiveTab('char-dham')}
          className={cn(
            'shrink-0 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200',
            activeTab === 'char-dham'
              ? 'bg-saffron-600 text-white shadow-soft'
              : 'border border-saffron-200 bg-white text-saffron-900 hover:bg-saffron-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
          )}
        >
          🛕 Char Dham & Holy Shrines
        </button>

        <button
          onClick={() => setActiveTab('architecture')}
          className={cn(
            'shrink-0 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200',
            activeTab === 'architecture'
              ? 'bg-saffron-600 text-white shadow-soft'
              : 'border border-saffron-200 bg-white text-saffron-900 hover:bg-saffron-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
          )}
        >
          🏛️ Architectural Wonders
        </button>
      </div>

      {/* TAB 1: Embedded Interactive Portal */}
      {activeTab === 'portal' && (
        <div className="space-y-4">
          <div
            className={cn(
              'card overflow-hidden transition-all duration-300 border border-saffron-200 shadow-pop relative',
              isFullscreen ? 'fixed inset-4 z-50 rounded-2xl' : 'h-[640px] sm:h-[720px] w-full'
            )}
          >
            {/* Embedded Toolbar */}
            <div className="flex items-center justify-between border-b border-saffron-200/70 bg-gradient-to-r from-saffron-50 via-marigold-50 to-saffron-100/50 px-4 py-2.5 dark:border-slate-800 dark:from-slate-900 dark:to-slate-800">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-saffron-500 text-white shadow-xs">
                  <Landmark className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-display text-xs font-bold text-saffron-950 dark:text-white">
                    India Temple Heritage Portal
                  </p>
                  <p className="text-[10px] text-saffron-600 dark:text-slate-400">
                    india-temple-heritage-portal-three.vercel.app
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIframeKey((k) => k + 1)}
                  className="rounded-lg p-1.5 text-saffron-600 hover:bg-saffron-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                  title="Reload Portal"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="rounded-lg p-1.5 text-saffron-600 hover:bg-saffron-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen'}
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
                <a
                  href="https://india-temple-heritage-portal-three.vercel.app/#/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg p-1.5 text-saffron-600 hover:bg-saffron-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                  title="Open in new window"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Embedded Iframe */}
            <iframe
              key={iframeKey}
              src="https://india-temple-heritage-portal-three.vercel.app/#/"
              title="India Temple Heritage Portal"
              className="h-[calc(100%-46px)] w-full border-0 bg-slate-950"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          <div className="flex items-center justify-between text-xs text-saffron-700 dark:text-slate-400 px-1">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-saffron-500" />
              Interactive 3D model tours, temple timeline, and architectural maps powered by India Temple Heritage.
            </span>
            <button
              onClick={() => setActiveTab('all')}
              className="font-semibold text-saffron-600 hover:text-saffron-800 dark:text-saffron-400 flex items-center gap-1"
            >
              Browse Temple Showcase Cards <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: Temple Cards Showcase with Rich Hover & Animation Styles */}
      <div className="space-y-4">
        {activeTab !== 'portal' && (
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-saffron-950 dark:text-white">
              Sacred Temples & Darshan Heritage
            </h3>
            <span className="chip bg-saffron-100 text-saffron-800 font-semibold dark:bg-slate-800 dark:text-saffron-300">
              {filteredTemples.length} Temples Cataloged
            </span>
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemples.map((temple) => (
            <div
              key={temple.id}
              className="card group overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:border-saffron-400/90 dark:hover:border-saffron-500/60"
            >
              {/* Image Container with Automatic Sit & Fit */}
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-saffron-100 dark:bg-slate-800">
                <img
                  src={temple.imageUrl}
                  alt={temple.name}
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Auspicious Badges */}
                <span className="absolute left-3 top-3 chip bg-white/95 text-saffron-800 shadow-soft backdrop-blur-xs font-bold text-[11px] transition-transform group-hover:scale-105">
                  {temple.category}
                </span>

                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <p className="flex items-center gap-1 text-[11px] font-medium text-saffron-200">
                    <MapPin className="h-3 w-3 text-saffron-400 shrink-0" />
                    {temple.location}, {temple.state}
                  </p>
                  <h3 className="font-display text-base font-bold text-white drop-shadow-sm group-hover:text-saffron-200 transition-colors">
                    {temple.name}
                  </h3>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-saffron-900 dark:text-saffron-200">
                      Presiding Deity:
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {temple.deity}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-saffron-900 dark:text-saffron-200">
                      Architecture:
                    </span>
                    <span className="font-medium text-slate-600 dark:text-slate-400 text-right truncate max-w-[180px]">
                      {temple.architecture}
                    </span>
                  </div>
                </div>

                <p className="line-clamp-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {temple.description}
                </p>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center gap-1.5 border-t border-saffron-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setActiveTab('portal');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="btn-secondary flex-1 text-xs py-2 group-hover:border-saffron-300 transition-all flex items-center justify-center gap-1"
                    title="View 3D Temple Model"
                  >
                    <Eye className="h-3.5 w-3.5 text-saffron-600" />
                    3D Tour
                  </button>

                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/app/temple-heritage#${temple.id}`;
                      navigator.clipboard.writeText(`${temple.name} (${temple.location}, ${temple.state}) - Sacred Darshan & Heritage Portal: ${url}`);
                      success(
                        'Temple Link Copied!',
                        `Sacred link for ${temple.name} copied to clipboard to share with devotees.`,
                        {
                          label: 'Book Suggested Pooja',
                          onClick: () => navigate(temple.suggestedPoojaId ? `/app/book?service=${temple.suggestedPoojaId}` : '/app/services'),
                        }
                      );
                    }}
                    className="btn-secondary px-2.5 py-2 text-xs transition-all hover:bg-saffron-100 dark:hover:bg-slate-800 flex items-center justify-center"
                    title="Share Temple Link"
                    aria-label={`Share ${temple.name} link`}
                  >
                    <Share2 className="h-3.5 w-3.5 text-saffron-600 dark:text-saffron-400" />
                  </button>

                  <button
                    onClick={() => {
                      if (temple.suggestedPoojaId) {
                        navigate(`/app/book?service=${temple.suggestedPoojaId}`);
                      } else {
                        navigate('/app/services');
                      }
                    }}
                    className="btn-primary flex-1 text-xs py-2 shadow-soft transition-all duration-200 hover:scale-[1.02] flex items-center justify-center gap-1"
                  >
                    <CalendarHeart className="h-3.5 w-3.5" />
                    Book Pooja
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
