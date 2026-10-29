import React, { useRef, useState } from 'react';
import {
  Download,
  Printer,
  Edit3,
  Share2,
  Check,
  Eye,
  Loader2,
  Sparkles,
  Flame,
  Award,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Modal } from '../ui/Modal';
import { SankalpCertificateView, type SankalpData } from './SankalpCertificateView';
import { useToast } from '../../context/ToastContext';
import { type Booking } from '../../lib/firebase';
import { formatDateTime } from '../../lib/utils';

interface SankalpPatraModalProps {
  open: boolean;
  onClose: () => void;
  booking?: Booking | null;
  initialData?: Partial<SankalpData>;
}

const COMMON_GOTRAS = [
  'काश्यप (Kashyap)',
  'भारद्वाज (Bharadwaj)',
  'वशिष्ठ (Vashishta)',
  'गौतम (Gautam)',
  'गर्ग (Garg)',
  'पराशर (Parashar)',
  'शाण्डिल्य (Shandilya)',
  'कौशिक (Kaushik)',
  'अंगिरस (Angiras)',
  'हरित (Harita)',
  'अत्रि (Atri)',
  'विश्वामित्र (Vishwamitra)',
  'कश्यप-गोत्र (Kashyap)',
  'अन्य / विशिष्ट गोत्र (Other)',
];

const VEDIC_NAKSHATRAS = [
  'रोहिणी (Rohini)',
  'अश्विनी (Ashwini)',
  'पुष्य (Pushya)',
  'मृगशिरा (Mrigashirsha)',
  'हस्त (Hasta)',
  'चित्रा (Chitra)',
  'स्वाती (Swati)',
  'अनुराधा (Anuradha)',
  'श्रवण (Shravana)',
  'धनिष्ठा (Dhanishta)',
  'रेवती (Revati)',
  'कृतिका (Krittika)',
  'उत्तरा फाल्गुनी (Uttara Phalguni)',
  'पूर्वाषाढ़ा (Purva Ashadha)',
  'उत्तराषाढ़ा (Uttara Ashadha)',
];

const VEDIC_RASHIS = [
  'मेष (Aries)',
  'वृषभ (Taurus)',
  'मिथुन (Gemini)',
  'कर्क (Cancer)',
  'सिंह (Leo)',
  'कन्या (Virgo)',
  'तुला (Libra)',
  'वृश्चिक (Scorpio)',
  'धनु (Sagittarius)',
  'मकर (Capricorn)',
  'कुम्भ (Aquarius)',
  'मीन (Pisces)',
];

export function SankalpPatraModal({ open, onClose, booking, initialData }: SankalpPatraModalProps) {
  const { success, error: toastError, info } = useToast();
  const certificateRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'customize'>('preview');

  // Derive initial values from booking or fallback demo data
  const defaultBookingId = booking?.id || 'demo_booking_2026';
  const defaultCertId = `SKP-VDC-2026-${(booking?.id || 'MUKHYA').slice(0, 8).toUpperCase()}`;

  const [formData, setFormData] = useState<SankalpData>(() => ({
    certificateId: defaultCertId,
    bookingId: defaultBookingId,
    devoteeName:
      initialData?.devoteeName ||
      booking?.devotee?.full_name ||
      'श्री राजेश कुमार शर्मा (Rajesh Sharma)',
    familyMembers:
      initialData?.familyMembers ||
      'सौ. सुनीता शर्मा (धर्मपत्नी), चि. आयुष एवं कु. अनन्या',
    gotra: initialData?.gotra || booking?.gotra || 'काश्यप (Kashyap)',
    nakshatra: initialData?.nakshatra || 'रोहिणी (Rohini)',
    rashi: initialData?.rashi || 'वृषभ (Taurus)',
    ceremonyName:
      initialData?.ceremonyName ||
      booking?.service?.name ||
      'गृह प्रवेश एवं वास्तु शांति महापूजा (Griha Pravesh & Vastu Shanti)',
    ceremonyDate:
      initialData?.ceremonyDate ||
      (booking?.scheduled_at ? formatDateTime(booking.scheduled_at) : '16 Oct 2026, 11:30 AM'),
    muhurat:
      initialData?.muhurat ||
      'अभिजीत मुहूर्त (प्रातः 11:45 से 12:35) • शुक्ल पक्ष',
    location:
      initialData?.location ||
      booking?.address ||
      'यजमान निवास, वाराणसी धाम (Varanasi)',
    mode: (initialData?.mode || booking?.mode || 'home') as 'home' | 'online' | 'temple',
    panditName:
      initialData?.panditName ||
      booking?.pandit?.full_name ||
      'वेदमूर्ति आचार्य विद्याधर शास्त्री (Vidyadhar Shastri)',
    panditTitle:
      initialData?.panditTitle ||
      'शुक्ल यजुर्वेद एवं कर्मकाण्ड विशारद, काशी पीठ',
    panditSealText: '॥ पूजाकनेक्ट शास्त्रोक्त प्रमाणीकरणम् ॥',
    sankalpPurpose:
      initialData?.sankalpPurpose ||
      booking?.sankalp ||
      'नूतन गृह प्रवेश, वास्तु दोष निवारण, सुख-शान्ति, आरोग्य एवं समृद्धि',
    issuedAt:
      initialData?.issuedAt ||
      new Date().toLocaleDateString('hi-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
  }));

  // Download high-resolution printable PDF
  const handleDownloadPDF = async () => {
    if (!certificateRef.current) return;
    setDownloading(true);

    try {
      // Allow DOM to settle
      await new Promise((resolve) => setTimeout(resolve, 200));

      const element = certificateRef.current;
      const canvas = await html2canvas(element, {
        scale: 2.5, // High resolution for print clarity
        useCORS: true,
        logging: false,
        backgroundColor: '#FFFDF7',
        windowWidth: 1024,
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      // A4 Landscape dimensions: 297mm x 210mm
      const pdfWidth = 297;
      const pdfHeight = 210;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      const cleanFileName = `Sankalp_Patra_${formData.devoteeName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      pdf.save(cleanFileName);

      success('Sankalp Patra Downloaded!', 'Your sacred blessings certificate has been saved as PDF.', {
        label: 'Print Certificate',
        onClick: handlePrint,
      });
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      toastError('Download Failed', 'Could not generate PDF. Please try the Print option.');
    } finally {
      setDownloading(false);
    }
  };

  // Direct Browser High-Res Print
  const handlePrint = () => {
    info('Opening Print Dialog', 'Preparing high-resolution Vedic certificate layout for printing.');
    window.print();
  };

  // Copy Verification Link
  const handleCopyLink = () => {
    const text = `🪔 Sacred Sankalp Patra - PoojaConnect\nCertificate ID: ${formData.certificateId}\nYajman: ${formData.devoteeName}\nCeremony: ${formData.ceremonyName}\nPresiding Acharya: ${formData.panditName}\nVerified Shastric Record.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    success('Certificate Link Copied!', 'Sacred certificate details copied to clipboard.', {
      label: 'Preview Certificate',
      onClick: () => setActiveTab('preview'),
    });
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="🪔 Digital Sankalp Patra & Blessings Certificate"
      footer={
        <div className="flex flex-wrap items-center justify-between w-full gap-2">
          <div className="flex items-center gap-1 text-xs text-saffron-700 dark:text-saffron-300">
            <Sparkles className="w-4 h-4 text-marigold-500" />
            <span className="hidden sm:inline">Vedic Shastric Certification with Verified QR Seal</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="btn-secondary text-xs sm:text-sm"
              title="Share verification details"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Share'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="btn-secondary text-xs sm:text-sm"
              title="Print directly to paper or Save as PDF via browser"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="btn-gold text-xs sm:text-sm shadow-md"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{downloading ? 'Generating PDF…' : 'Download PDF (A4)'}</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Navigation Tabs between Preview and Customize */}
        <div className="flex items-center justify-between border-b border-saffron-200/70 pb-3 dark:border-slate-800">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('preview')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                activeTab === 'preview'
                  ? 'bg-saffron-600 text-white shadow-soft'
                  : 'bg-saffron-100/60 text-saffron-800 hover:bg-saffron-100 dark:bg-slate-800 dark:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Certificate Preview (प्रमाणपत्र)
            </button>
            <button
              onClick={() => setActiveTab('customize')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                activeTab === 'customize'
                  ? 'bg-saffron-600 text-white shadow-soft'
                  : 'bg-saffron-100/60 text-saffron-800 hover:bg-saffron-100 dark:bg-slate-800 dark:text-slate-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              Customize Family & Gotra (सपरिवार विवरण)
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300">
            <Award className="w-3.5 h-3.5 text-amber-600" />
            <span>Spiritual Keepsake • A4 Ready</span>
          </div>
        </div>

        {/* Tab 1: Certificate Preview */}
        {activeTab === 'preview' && (
          <div className="overflow-x-auto pb-2">
            <SankalpCertificateView ref={certificateRef} data={formData} />
          </div>
        )}

        {/* Tab 2: Customize Details */}
        {activeTab === 'customize' && (
          <div className="card p-4 sm:p-6 space-y-4 bg-white dark:bg-slate-900 border-saffron-200 dark:border-slate-800">
            <div className="flex items-center gap-2 border-b border-saffron-100 pb-2 dark:border-slate-800">
              <Flame className="w-4 h-4 text-saffron-600" />
              <h4 className="font-display font-semibold text-saffron-900 dark:text-white text-sm sm:text-base">
                Personalize Devotee, Family & Shastric Details
              </h4>
            </div>
            <p className="text-xs text-saffron-600 dark:text-slate-400">
              Update family members, Gotra, and Nakshatra so your downloadable Sankalp Patra contains complete sacred names.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="label">Mukhya Devotee Name (मुख्य यजमान)</label>
                <input
                  type="text"
                  value={formData.devoteeName}
                  onChange={(e) => setFormData({ ...formData, devoteeName: e.target.value })}
                  className="input"
                  placeholder="e.g. Rajesh Kumar Sharma"
                />
              </div>

              <div>
                <label className="label">Family Members (सपरिवार नाम)</label>
                <input
                  type="text"
                  value={formData.familyMembers || ''}
                  onChange={(e) => setFormData({ ...formData, familyMembers: e.target.value })}
                  className="input"
                  placeholder="e.g. Smt. Sunita (Wife), Aryan (Son), Ananya (Daughter)"
                />
              </div>

              <div>
                <label className="label">Gotra (गोत्र)</label>
                <div className="flex gap-2">
                  <select
                    value={formData.gotra}
                    onChange={(e) => setFormData({ ...formData, gotra: e.target.value })}
                    className="input"
                  >
                    {COMMON_GOTRAS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Janma Nakshatra (जन्म नक्षत्र)</label>
                <select
                  value={formData.nakshatra}
                  onChange={(e) => setFormData({ ...formData, nakshatra: e.target.value })}
                  className="input"
                >
                  {VEDIC_NAKSHATRAS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Rashi (राशि)</label>
                <select
                  value={formData.rashi}
                  onChange={(e) => setFormData({ ...formData, rashi: e.target.value })}
                  className="input"
                >
                  {VEDIC_RASHIS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Ceremony / Ritual (पूजा अनुष्ठान)</label>
                <input
                  type="text"
                  value={formData.ceremonyName}
                  onChange={(e) => setFormData({ ...formData, ceremonyName: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Auspicious Muhurat / Choghadiya (शुभ मुहूर्त)</label>
                <input
                  type="text"
                  value={formData.muhurat}
                  onChange={(e) => setFormData({ ...formData, muhurat: e.target.value })}
                  className="input"
                  placeholder="e.g. Abhijit Muhurat (11:45 AM - 12:35 PM)"
                />
              </div>

              <div>
                <label className="label">Sthan / Location (स्थान)</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="input"
                  placeholder="e.g. Devotee Residence / Varanasi"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="label">Sankalp Purpose / Vow (संकल्प हेतु एवं प्रार्थना)</label>
                <input
                  type="text"
                  value={formData.sankalpPurpose || ''}
                  onChange={(e) => setFormData({ ...formData, sankalpPurpose: e.target.value })}
                  className="input"
                  placeholder="e.g. Griha Shanti, Arogyam, Vastu Dosha Nivaran, and Divine Prosperity"
                />
              </div>

              <div>
                <label className="label">Presiding Acharya / Pandit (यज्ञाचार्य शास्त्री)</label>
                <input
                  type="text"
                  value={formData.panditName}
                  onChange={(e) => setFormData({ ...formData, panditName: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Pandit Qualifications (शास्त्री उपाधि)</label>
                <input
                  type="text"
                  value={formData.panditTitle || ''}
                  onChange={(e) => setFormData({ ...formData, panditTitle: e.target.value })}
                  className="input"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('preview');
                  success('Updated!', 'Certificate preview updated with your details.');
                }}
                className="btn-primary"
              >
                <Eye className="w-4 h-4" />
                Apply & View Certificate
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
