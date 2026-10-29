import React, { forwardRef } from 'react';
import { Flame, CheckCircle, ShieldCheck } from 'lucide-react';

export interface SankalpData {
  certificateId: string;
  bookingId: string;
  devoteeName: string;
  familyMembers?: string;
  gotra: string;
  nakshatra: string;
  rashi: string;
  ceremonyName: string;
  ceremonyDate: string;
  muhurat: string;
  location: string;
  mode: 'home' | 'online' | 'temple';
  panditName: string;
  panditTitle?: string;
  panditSealText?: string;
  sankalpPurpose?: string;
  issuedAt: string;
}

interface SankalpCertificateViewProps {
  data: SankalpData;
}

export const SankalpCertificateView = forwardRef<HTMLDivElement, SankalpCertificateViewProps>(
  ({ data }, ref) => {
    return (
      <div className="w-full flex justify-center py-2 bg-slate-900/10 dark:bg-slate-950/40 print:p-0 print:bg-white">
        {/* Certificate Container formatted for high-res A4 Landscape */}
        <div
          ref={ref}
          id="sankalp-certificate-canvas"
          className="relative w-full max-w-[850px] min-h-[600px] p-6 sm:p-10 rounded-2xl bg-gradient-to-br from-[#FFFDF7] via-[#FFF9EE] to-[#FFF4DE] text-[#3D1A04] shadow-2xl border-4 border-[#C88A2C] overflow-hidden select-none print:max-w-none print:w-full print:border-8 print:shadow-none print:rounded-none"
          style={{
            fontFamily: "'Fraunces', Georgia, serif",
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }}
        >
          {/* Subtle Vedic Watermark in Background */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.035] pointer-events-none select-none">
            <span className="text-[340px] font-bold text-[#8A3B00]">ॐ</span>
          </div>

          {/* Ornate Gold Double Border with Corner Accents */}
          <div className="absolute inset-2.5 sm:inset-4 border-2 border-[#D4A347]/60 pointer-events-none rounded-xl">
            {/* Top-Left Corner */}
            <div className="absolute -top-3 -left-3 text-[#B37416] text-xl font-bold bg-[#FFFDF7] px-1 rounded">
              ⚜
            </div>
            {/* Top-Right Corner */}
            <div className="absolute -top-3 -right-3 text-[#B37416] text-xl font-bold bg-[#FFFDF7] px-1 rounded">
              ⚜
            </div>
            {/* Bottom-Left Corner */}
            <div className="absolute -bottom-3 -left-3 text-[#B37416] text-xl font-bold bg-[#FFFDF7] px-1 rounded">
              ⚜
            </div>
            {/* Bottom-Right Corner */}
            <div className="absolute -bottom-3 -right-3 text-[#B37416] text-xl font-bold bg-[#FFFDF7] px-1 rounded">
              ⚜
            </div>
          </div>

          {/* Header with Auspicious Vedic Symbols */}
          <div className="relative text-center mb-5">
            {/* Divine Invocation */}
            <div className="inline-flex items-center justify-center gap-3 px-5 py-1 mb-2 rounded-full bg-gradient-to-r from-transparent via-[#FDE8BD]/80 to-transparent">
              <span className="text-[#C2410C] text-sm">卐</span>
              <span className="font-semibold text-xs sm:text-sm tracking-widest text-[#9A3412] uppercase">
                ॥ श्री गणेशाय नमः ॥ श्री कुलदेवतायै नमः ॥
              </span>
              <span className="text-[#C2410C] text-sm">卐</span>
            </div>

            {/* Glowing Golden Om Emblem */}
            <div className="flex items-center justify-center gap-3 my-1">
              <span className="text-[#D97706] text-lg">🪔</span>
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-[#F59E0B] via-[#D97706] to-[#9A3412] text-amber-50 flex items-center justify-center text-2xl sm:text-3xl font-bold shadow-md border-2 border-[#FDE68A]">
                ॐ
              </div>
              <span className="text-[#D97706] text-lg">🪔</span>
            </div>

            {/* Main Sacred Titles */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-wide text-[#782806] mt-1">
              ॥ वैदिक संकल्प पत्रम् एवं शुभाशीर्वादः ॥
            </h1>
            <p className="text-xs sm:text-sm font-medium tracking-wider text-[#92400E] uppercase mt-0.5">
              Vedic Sankalp Patra & Divine Blessings Certificate
            </p>
            <p className="text-[11px] text-[#A16207] italic mt-0.5">
              Certified by PoojaConnect Shastric Vidhan Sansthan • शास्त्रोक्त विधिपूर्वकं सम्पन्नम्
            </p>
          </div>

          {/* Certificate Metadata Badge Row */}
          <div className="relative flex flex-wrap items-center justify-between gap-2 border-y border-[#E5C384]/70 py-2 px-3 sm:px-6 mb-5 text-[11px] sm:text-xs text-[#78350F] bg-[#FFF9EE]/70 rounded-md">
            <div>
              <span className="font-semibold text-[#9A3412]">प्रमाणपत्र सं. (ID):</span>{' '}
              <span className="font-mono font-bold tracking-wider">{data.certificateId}</span>
            </div>
            <div>
              <span className="font-semibold text-[#9A3412]">शुभ मुहूर्त / तिथि:</span>{' '}
              <span>{data.muhurat || data.ceremonyDate}</span>
            </div>
            <div className="flex items-center gap-1 text-[#047857] font-semibold">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>शास्त्रोक्त प्रमाणित (Sanctified)</span>
            </div>
          </div>

          {/* Sacred Sankalp Declaration in Sanskrit Calligraphic Style */}
          <div className="relative mb-5 px-3 sm:px-6 py-3 rounded-xl bg-gradient-to-r from-[#FEF3C7]/40 via-[#FDE68A]/30 to-[#FEF3C7]/40 border border-[#F59E0B]/30 text-center">
            <p className="text-xs sm:text-sm leading-relaxed text-[#782806] italic font-medium">
              "अद्य शुभदिने, शुभमुहूर्ते, <span className="font-bold underline decoration-[#D97706]/40">{data.location || 'पावन तीर्थ / यजमान गृह'}</span> क्षेत्रे,
              श्री गणेश-गायत्री-इष्टदेव सान्निध्ये, यजमान <span className="font-bold text-[#9A3412]">{data.devoteeName}</span> सपरिवार{' '}
              <span className="font-bold underline decoration-[#D97706]/40">{data.gotra ? `${data.gotra} गोत्र` : 'विशिष्ट गोत्र'}</span>,{' '}
              {data.nakshatra && <span>{data.nakshatra} नक्षत्रे, </span>}
              सर्व-मंगल-कामना-सिद्धये, <span className="font-bold text-[#9A3412]">{data.ceremonyName}</span> महापूजनम् विधिपूर्वकं सम्पन्नम्।"
            </p>
          </div>

          {/* Yajman & Ritual Details Grid */}
          <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 text-xs text-[#522107]">
            {/* Devotee / Yajman Info Box */}
            <div className="p-3 sm:p-4 rounded-xl border border-[#E5C384]/80 bg-white/70 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#9A3412] border-b border-[#F3E1B9] pb-1.5 mb-2 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-[#D97706]" />
                यजमान एवं परिवार विवरण (Yajman Details)
              </h3>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#844A15]">मुख्य यजमान (Devotee):</span>
                  <span className="font-bold text-[#782806]">{data.devoteeName}</span>
                </div>
                {data.familyMembers && (
                  <div className="flex justify-between">
                    <span className="text-[#844A15]">सपरिवार (Family):</span>
                    <span className="font-medium text-right text-[#782806] max-w-[200px] truncate">
                      {data.familyMembers}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#844A15]">गोत्र (Gotra):</span>
                  <span className="font-semibold text-[#782806]">{data.gotra || 'काश्यप (Kashyap)'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#844A15]">नक्षत्र व राशि (Nakshatra & Rashi):</span>
                  <span className="font-semibold text-[#782806]">
                    {data.nakshatra || 'रोहिणी (Rohini)'} {data.rashi ? `• ${data.rashi}` : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Sacred Ceremony & Muhurat Box */}
            <div className="p-3 sm:p-4 rounded-xl border border-[#E5C384]/80 bg-white/70 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#9A3412] border-b border-[#F3E1B9] pb-1.5 mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" />
                अनुष्ठान व मुहूर्त विधान (Ritual Vidhan)
              </h3>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#844A15]">पूजा / अनुष्ठान:</span>
                  <span className="font-bold text-[#782806]">{data.ceremonyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#844A15]">सम्पन्न तिथि (Date):</span>
                  <span className="font-medium text-[#782806]">{data.ceremonyDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#844A15]">विधान माध्यम (Mode):</span>
                  <span className="font-semibold text-[#782806] capitalize">
                    {data.mode === 'online' ? 'Live E-Pooja / Virtual' : data.mode === 'temple' ? 'Temple Kshetra' : 'Griha Pravesh / Home'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#844A15]">संकल्प हेतु (Vow/Purpose):</span>
                  <span className="font-medium text-[#782806] max-w-[200px] truncate">
                    {data.sankalpPurpose || 'सुख, शांति, आरोग्य एवं पारिवारिक समृद्धि'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Chanted Vedic Shanti Shloka */}
          <div className="relative mb-6 p-4 rounded-xl bg-gradient-to-r from-[#FFFBEB] via-[#FEF3C7]/60 to-[#FFFBEB] border-2 border-dashed border-[#D97706]/50 text-center">
            <p className="text-xs font-semibold text-[#9A3412] uppercase tracking-wider mb-1">
              ॥ वेद मन्त्र शुभाशीर्वादः (Chanted Vedic Blessing) ॥
            </p>
            <p className="text-xs sm:text-sm font-bold text-[#782806] leading-relaxed">
              ॐ स्वस्ति न इन्द्रो वृद्धश्रवाः स्वस्ति नः पूषा विश्ववेदाः ।<br />
              स्वस्ति नस्तार्क्ष्यो अरिष्टनेमिः स्वस्ति नो बृहस्पतिर्दधातु ॥<br />
              ॐ दीर्घायुष्यम् आरोग्यम् ऐश्वर्यम् कुलवृद्धिः सुख-शान्तिः च भवतु ॥
            </p>
            <p className="text-[10px] sm:text-[11px] text-[#854D0E] italic mt-1 max-w-xl mx-auto">
              "By Agni Sakshi and the holy mantras chanted by Shastriji, may the Almighty bestow longevity,
              radiant health, prosperity, familial bliss, and divine protection upon you and your lineage."
            </p>
          </div>

          {/* Bottom Shastriji Seal, Signature, and Verification QR Code */}
          <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t-2 border-[#E5C384]/70">
            {/* Presiding Pandit Shastriji Signature & Seal */}
            <div className="flex items-center gap-3">
              {/* Circular Gold Seal */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-[#B45309] bg-gradient-to-br from-[#FEF3C7] to-[#FDE68A] flex flex-col items-center justify-center p-1 text-center shadow-inner">
                <span className="text-[8px] font-bold text-[#9A3412] leading-none">शास्त्रोक्त</span>
                <span className="text-xs font-bold text-[#78350F] my-0.5">प्रमाणित</span>
                <span className="text-[7px] text-[#B45309] leading-none">SHASTRI SEAL</span>
              </div>
              <div>
                <p className="text-[11px] text-[#854D0E] uppercase font-semibold">यज्ञाचार्य / शास्त्री जी:</p>
                <p className="text-sm font-bold text-[#782806] font-display">
                  {data.panditName || 'आचार्य शास्त्री जी'}
                </p>
                <p className="text-[10px] text-[#9A3412] italic">
                  {data.panditTitle || 'Shukla Yajurveda & Smarta Vidhan Certified'}
                </p>
                <div className="w-24 h-0.5 bg-[#B45309]/40 mt-1" />
                <p className="text-[9px] text-[#A16207]">Verified Digital Signature</p>
              </div>
            </div>

            {/* QR Code Verification Badge */}
            <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white/80 border border-[#E5C384]/80 shadow-sm">
              {/* SVG QR Code Simulation */}
              <svg className="w-11 h-11 text-[#78350F]" viewBox="0 0 100 100" fill="currentColor">
                <rect x="0" y="0" width="30" height="30" rx="3" fill="#78350F" />
                <rect x="5" y="5" width="20" height="20" rx="2" fill="#FFFDF7" />
                <rect x="9" y="9" width="12" height="12" rx="1" fill="#78350F" />
                <rect x="70" y="0" width="30" height="30" rx="3" fill="#78350F" />
                <rect x="75" y="5" width="20" height="20" rx="2" fill="#FFFDF7" />
                <rect x="79" y="9" width="12" height="12" rx="1" fill="#78350F" />
                <rect x="0" y="70" width="30" height="30" rx="3" fill="#78350F" />
                <rect x="5" y="75" width="20" height="20" rx="2" fill="#FFFDF7" />
                <rect x="9" y="79" width="12" height="12" rx="1" fill="#78350F" />
                <rect x="40" y="10" width="10" height="10" fill="#78350F" />
                <rect x="55" y="15" width="10" height="10" fill="#78350F" />
                <rect x="35" y="40" width="30" height="20" rx="2" fill="#B45309" />
                <rect x="40" y="70" width="10" height="20" fill="#78350F" />
                <rect x="60" y="50" width="10" height="15" fill="#78350F" />
                <rect x="75" y="40" width="15" height="10" fill="#78350F" />
                <rect x="80" y="75" width="15" height="15" fill="#78350F" />
              </svg>
              <div className="text-[9px] text-[#78350F] leading-tight">
                <p className="font-bold uppercase tracking-wider text-[#9A3412]">PoojaConnect Verify</p>
                <p className="font-mono text-[8px] text-slate-500">ID: {data.certificateId.slice(0, 16)}</p>
                <p className="text-[8px] text-[#A16207]">Tamper-Proof Digital Ledger</p>
              </div>
            </div>

            {/* Institutional Seal */}
            <div className="text-right sm:text-right">
              <p className="text-[11px] text-[#854D0E] uppercase font-semibold">निर्गमन तिथि (Issued Date):</p>
              <p className="text-xs font-bold text-[#782806]">{data.issuedAt}</p>
              <div className="inline-flex items-center gap-1 mt-1 text-[10px] text-[#059669] font-medium bg-[#ECFDF5] px-2 py-0.5 rounded-full border border-[#A7F3D0]">
                <span>धर्मो रक्षति रक्षितः</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

SankalpCertificateView.displayName = 'SankalpCertificateView';
