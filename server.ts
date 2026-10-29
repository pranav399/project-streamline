import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import { createServer as createViteServer } from 'vite';

dotenv.config();

function parsePort(): number {
  if (process.env.PORT && !isNaN(Number(process.env.PORT))) {
    return Number(process.env.PORT);
  }
  const args = process.argv.slice(2);
  const portIndex = args.findIndex((arg) => arg === '--port' || arg === '-p');
  if (portIndex !== -1 && args[portIndex + 1] && !isNaN(Number(args[portIndex + 1]))) {
    return Number(args[portIndex + 1]);
  }
  return 3000;
}

const app = express();

// Full cross-origin resource sharing (CORS) support for localhost on ANY port, 127.0.0.1, LAN IPs, and Cloud previews
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// In-Memory Store for OTPs
// Structure: Map<email, { code: string; expiresAt: number; attempts: number }>
interface OTPRecord {
  code: string;
  expiresAt: number;
  attempts: number;
}

const otpStore = new Map<string, OTPRecord>();

// Helper to send OTP via SendGrid, SMTP, or Console/Simulation Fallback
async function dispatchOTPEmail(email: string, otpCode: string): Promise<{ method: string; simulated: boolean }> {
  const sendgridKey = process.env.SENDGRID_API_KEY;
  const sendgridFrom = process.env.SENDGRID_FROM_EMAIL || 'noreply@poojaconnect.com';

  const smtpHost = process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io';
  const smtpPort = Number(process.env.SMTP_PORT || 2525);
  const smtpUser = process.env.SMTP_USER || 'ea679ad7dca40f';
  const smtpPass = process.env.SMTP_PASS || '3da0176041deac';
  const smtpFrom = process.env.SMTP_FROM_EMAIL || '"PoojaConnect" <noreply@poojaconnect.com>';

  const emailSubject = 'Your PoojaConnect Verification Code';
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #d97706; margin: 0; font-size: 24px;">PoojaConnect</h2>
        <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Sacred Vedic Services & Samagri</p>
      </div>
      <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
        <p style="margin: 0 0 10px 0; color: #92400e; font-size: 14px; font-weight: 600;">YOUR ONE-TIME PASSCODE (OTP)</p>
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #b45309;">${otpCode}</span>
        <p style="margin: 10px 0 0 0; color: #b45309; font-size: 12px;">Valid for 10 minutes. Do not share this code with anyone.</p>
      </div>
      <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">
        You requested this verification code to access your PoojaConnect account. If you did not request this email, please ignore it.
      </p>
      <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 20px 0;" />
      <p style="color: #9ca3af; font-size: 11px; text-align: center;">
        © ${new Date().getFullYear()} PoojaConnect. Har Har Mahadev 🙏
      </p>
    </div>
  `;

  // 1. SMTP Nodemailer (Mailtrap / Custom SMTP)
  if (smtpUser && smtpPass && smtpHost) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
      await transporter.sendMail({
        from: smtpFrom,
        to: email,
        subject: emailSubject,
        html: emailHtml,
      });
      console.log(`[SMTP Mailtrap] OTP email sent to test sandbox for ${email}`);
      return { method: 'Mailtrap Sandbox & Screen Verification', simulated: true };
    } catch (err) {
      console.error('[SMTP Mailtrap Error] Failed to send email, trying fallback:', err);
    }
  }

  // 2. SendGrid API (Alternative)
  if (sendgridKey) {
    try {
      sgMail.setApiKey(sendgridKey);
      await sgMail.send({
        to: email,
        from: sendgridFrom,
        subject: emailSubject,
        html: emailHtml,
      });
      console.log(`[SendGrid] OTP email sent successfully to ${email}`);
      return { method: 'SendGrid Live Email', simulated: false };
    } catch (err) {
      console.error('[SendGrid Error] Failed to send email, falling back:', err);
    }
  }

  // 3. Fallback / Dev Mode Logger
  console.log(`\n==================================================`);
  console.log(`[OTP INSTANT DISPATCH SIMULATION]`);
  console.log(`To: ${email}`);
  console.log(`OTP Code: ${otpCode}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`==================================================\n`);

  return { method: 'Instant Screen & Console Verification', simulated: true };
}

// API Routes
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Send OTP Route
app.post('/api/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Generate 6-digit random numeric OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    // Save in OTP store
    otpStore.set(normalizedEmail, {
      code: otpCode,
      expiresAt,
      attempts: 0,
    });

    // Dispatch email (SendGrid / SMTP / Dev fallback)
    const dispatchResult = await dispatchOTPEmail(normalizedEmail, otpCode);

    return res.json({
      success: true,
      message: `OTP generated for ${email}. Check your screen or email inbox.`,
      deliveryMethod: dispatchResult.method,
      simulated: true,
      // Always guarantee the user can see and auto-fill the OTP immediately
      simulatedOtp: otpCode,
    });
  } catch (error: any) {
    console.error('Error sending OTP:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to send OTP email.',
    });
  }
});

// Verify OTP Route
app.post('/api/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP code are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const record = otpStore.get(normalizedEmail);

    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'No OTP requested for this email or code has expired. Please click "Resend OTP".',
      });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new verification code.',
      });
    }

    record.attempts += 1;

    if (record.code !== otp.trim()) {
      if (record.attempts >= 5) {
        otpStore.delete(normalizedEmail);
        return res.status(400).json({
          success: false,
          message: 'Too many failed attempts. Please request a new OTP code.',
        });
      }
      return res.status(400).json({
        success: false,
        message: `Invalid OTP code. You have ${5 - record.attempts} attempts remaining.`,
      });
    }

    // Success - clear OTP
    otpStore.delete(normalizedEmail);

    return res.json({
      success: true,
      message: 'OTP code verified successfully!',
      email: normalizedEmail,
    });
  } catch (error: any) {
    console.error('Error verifying OTP:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Verification failed. Please try again.',
    });
  }
});

// Reset Password with OTP
app.post('/api/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, OTP code and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const record = otpStore.get(normalizedEmail);

    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'No OTP requested for this email or code has expired. Please click "Request Code".',
      });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new verification code.',
      });
    }

    if (record.code !== otp.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP code. Please enter the 6-digit code provided.',
      });
    }

    // Clear used OTP
    otpStore.delete(normalizedEmail);

    return res.json({
      success: true,
      message: 'Password reset verified successfully!',
      email: normalizedEmail,
    });
  } catch (error: any) {
    console.error('Error resetting password:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Password reset failed.',
    });
  }
});

function isQuestionOutOfProjectScope(query: string): boolean {
  const q = query.toLowerCase().trim();

  // If question matches unrelated technical, political, celebrity, financial or academic non-project domains
  const outOfScopePatterns = [
    /\b(python|javascript|typescript|c\+\+|java|react|angular|vue|sql|html|css|docker|kubernetes|node\.js|github|git|programming|write code|debug code|algorithm)\b/i,
    /\b(bitcoin|crypto|cryptocurrency|stock market|shares|forex|wall street|nasdaq|dividend|trading)\b/i,
    /\b(football|fifa|nba|messi|ronaldo|premier league|ipl score|champions league)\b/i,
    /\b(hollywood|bollywood movies|netflix|celebrity gossip|film review|box office)\b/i,
    /\b(politics|election results|prime minister debate|presidential candidate|world war|geopolitics)\b/i,
    /\b(medical diagnosis|prescribe medication|symptoms of cancer|antibiotics dose|covid treatment)\b/i,
    /\b(solve equation|algebra|calculus|quantum physics theorem)\b/i
  ];

  return outOfScopePatterns.some((pattern) => pattern.test(q));
}

// Devotee Vedic Chatbot Assistant Route with Dual-Engine Automatic Failover & Strict Project Scope
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, reply: 'Please provide a question or message.' });
    }

    const trimmed = message.trim();

    // Strict Project Domain Boundary Guard
    const OUT_OF_SCOPE_MSG = `Namaste devotee! 🙏 I am Pooja Mitra, your dedicated spiritual guide exclusively for the PoojaConnect platform.\n\nMy sacred purpose is strictly limited to:\n• Sacred Vedic Poojas, Havans & Samskaras (Griha Pravesh, Satyanarayan, Rudrabhishek, etc.)\n• Ritual Vidhi, preparation steps & Auspicious Muhurats\n• Authentic Pooja Samagri kits & holy items in the PoojaConnect Shop\n• Booking verified Vedic Pandits in your preferred language\n• Exploring India's Sacred Temple Heritage portal\n\nI cannot assist with topics outside of our devotional platform. Please ask about any pooja ceremony, booking a Shastriji, or ordering samagri!`;

    if (isQuestionOutOfProjectScope(trimmed)) {
      return res.json({
        success: true,
        reply: OUT_OF_SCOPE_MSG,
        source: 'domain-guard',
        model: 'PoojaConnect Domain Guard'
      });
    }

    // System instructions for concise, fast devotional responses
    const systemInstruction = `You are 'Pooja Mitra' (पूजा मित्र), the official spiritual guide and AI assistant for the PoojaConnect platform.

IMPORTANT INSTRUCTION FOR FAST, CONCISE RESPONSES:
- Keep your answers SHORT, RESPECTFUL, and CRISP (2 to 4 concise bullet points or 2-3 short sentences).
- Do NOT write long essays.
- Focus strictly on PoojaConnect Vedic ceremonies (Griha Pravesh, Satyanarayan, Rudrabhishek, Mahalakshmi, Navagraha, Vastu Shanti), auspicious Muhurat, pure Pooja Samagri kits, verified Pandits, and India Temple Heritage.
- If a question is outside Hindu Vedic rituals, ceremonies, samagri, or temples, politely decline in 1 short sentence.`;

    let reply = '';
    let source = '';
    let activeModel = '';

    // Prepare message history formatted for open-source AI
    const messagesPayload: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemInstruction },
    ];

    if (Array.isArray(history) && history.length > 0) {
      for (const item of history.slice(-4)) {
        messagesPayload.push({
          role: item.role === 'user' ? 'user' : 'assistant',
          content: item.text,
        });
      }
    }

    messagesPayload.push({
      role: 'user',
      content: trimmed,
    });

    // Helper function to call Keyless Free Open-Source AI inference with fast timeout
    async function callOpenSourceAI(model: string, timeoutMs = 3200): Promise<string | null> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const aiRes = await fetch('https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: messagesPayload,
            max_tokens: 280,
            temperature: 0.5,
          }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (!aiRes.ok) return null;
        const data: any = await aiRes.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content && typeof content === 'string' && content.trim()) {
          return content.trim();
        }
      } catch {
        // Handled via failover
      } finally {
        clearTimeout(timer);
      }
      return null;
    }

    // 1. Primary Free Open-Source AI Engine (Mistral-Nemo-Instruct-2407)
    try {
      const primaryResult = await callOpenSourceAI('Mistral-Nemo-Instruct-2407', 3200);
      if (primaryResult) {
        reply = primaryResult;
        source = 'open-source-ai-1';
        activeModel = 'Mistral-Nemo (Free Open AI 1)';
      }
    } catch {
      // Automatic shift to secondary AI
    }

    // 2. Automatic Shift to Secondary Free Open-Source AI Engine (Mistral-Small-3.2-24B-Instruct-2506)
    if (!reply) {
      try {
        console.log('[AI Shift] Primary AI did not respond, automatically shifting to Secondary Open-Source AI...');
        const secondaryResult = await callOpenSourceAI('Mistral-Small-3.2-24B-Instruct-2506', 3200);
        if (secondaryResult) {
          reply = secondaryResult;
          source = 'open-source-ai-2';
          activeModel = 'Mistral-Small (Free Open AI 2 Failover)';
        }
      } catch {
        // Automatic shift to instant offline engine
      }
    }

    if (reply) {
      return res.json({ success: true, reply, source, model: activeModel });
    }

    // 2. Comprehensive Smart Vedic Knowledge Base Fallback
    const lower = trimmed.toLowerCase();
    reply = '';

    if (lower.includes('griha') || lower.includes('housewarming') || lower.includes('new home') || lower.includes('home')) {
      reply = `Namaste! 🙏 For entering a new home, **Griha Pravesh Pooja** is the most sacred and essential ceremony.
      
Key Rituals included:
• **Vastu Purusha Pooja**: Purifies the directional energies and layout of the home.
• **Navagraha Hawan**: Pacifies all 9 planetary forces for prosperity and health.
• **Kalash Sthapana & Milk Boiling**: Boiling auspicious milk until it overflows signifies boundless abundance.
• **Ganesh & Lakshmi Avahan**: Welcoming prosperity, wisdom, and auspicious beginnings.

Duration: Approx 2-3 hours.
Dakshina: Starts from ₹3,500.
👉 You can easily book a verified Vedic Pandit in our "Book a Pooja" section and order our complete Griha Pravesh Samagri Kit!`;
    } else if (lower.includes('satyanarayan') || lower.includes('katha') || lower.includes('purnima')) {
      reply = `Pranam! 🪔 **Shri Satyanarayan Pooja & Katha** is performed to express gratitude to Lord Vishnu for family harmony, business success, and fulfillment of heartfelt wishes.

Important Details:
• **Best Timings**: Purnima (Full Moon), Sankranti, or any auspicious Thursday/Saturday.
• **Prasad**: Panchamrit (Milk, Curd, Ghee, Honey, Sugar) and Sheera/Prasadam made with pure wheat flour and banana.
• **Duration**: Approx 1.5 - 2 hours.
• **Offerings**: Tulsi leaves, betel nuts, yellow cloth, and Panchapallav.

👉 We have verified Pandits experienced in reciting the 5 sacred Adhyayas with melodious aarti. You can book directly in the Services tab!`;
    } else if (lower.includes('rudra') || lower.includes('shiva') || lower.includes('abhishek') || lower.includes('somwar')) {
      reply = `Har Har Mahadev! 🔱 **Rudrabhishek Pooja** is one of the most potent Vedic ceremonies dedicated to Lord Shiva to remove karmic obstacles, chronic illnesses, and negative energies.

Sacred Offerings for Abhishek:
• Pure Cow Milk, Curd, Ghee, Honey, Sugarcane juice, and Gangajal.
• Bilva leaves (Belpatra), Dhatura, Bhasma (sacred ash), and chandan.
• Recitation of the divine **Shri Rudram & Chamakam** by our certified Shastriji.

Duration: 90 - 120 minutes.
👉 Available for booking at your home or through special virtual temple sankalp.`;
    } else if (lower.includes('samagri') || lower.includes('kit') || lower.includes('items') || lower.includes('shop')) {
      reply = `Namaste! 📦 We provide **100% Pure, Organically Sourced Samagri** delivered right to your doorstep:
      
• **Complete Pooja Samagri Kit** (32 holy items including Camphor, Cow Ghee, Kumkum, Gangajal, Dhoop, Hawan Kund woods) - ₹1,299
• **Pure Gangajal from Haridwar** (500ml sealed at Har Ki Pauri) - ₹199
• **Solid Brass Peacock Diyas & Kalash** - Handcrafted brassware for your home mandir
• **Original Panchmukhi Rudraksha Mala** (108 beads) - ₹899

👉 Click "Samagri Shop" in your menu to view the full catalog with quick home delivery!`;
    } else if (lower.includes('temple') || lower.includes('heritage') || lower.includes('darshan') || lower.includes('jyotirlinga') || lower.includes('kashi')) {
      reply = `Pranam! 🛕 Discover the eternal grandeur of **India's Sacred Temple Heritage**:
      
• **Jyotirlingas**: Kashi Vishwanath, Kedarnath, Somnath, Mahakaleshwar, and more.
• **Architectural Marvels**: Dravidian towers of Meenakshi Amman, the Chola majesty of Brihadeeswarar, and the Kalinga chariot of Konark.
• **Char Dham**: Badrinath, Puri, Rameshwaram, and Dwarka.

👉 Visit our new **Temple Heritage** section in the navigation to explore an interactive 3D portal, high-definition sanctum photos, architectural timelines, and temple history!`;
    } else if (lower.includes('pandit') || lower.includes('book') || lower.includes('how to')) {
      reply = `Booking a Pandit on PoojaConnect is simple, transparent, and authentic:
      
1. Go to **Book a Pooja** or **Find Pandits**.
2. Select your desired ceremony (e.g. Griha Pravesh, Satyanarayan, Navagraha, Vastu).
3. Choose your preferred date, muhurat slot, and preferred language (Hindi, Sanskrit, Tamil, Telugu, etc.).
4. Select whether you'd like the Pandit to bring the complete Samagri.
5. Confirm booking — your Pandit will contact you for sankalp and arrive punctually! 🙏`;
    } else {
      reply = `Namaste and Pranam! 🙏 Welcome to PoojaConnect. I am your **Pooja Mitra** assistant.
      
I can assist you with:
• **Choosing the right ceremony** for your occasion (Housewarming, Childbirth, Business, Wedding, Peace).
• **Vedic rituals, vidhi, and auspicious timings** (Muhurat & Nakshatra).
• **Pooja Samagri checklists** & pure organic pooja items in our shop.
• **Exploring India's Sacred Temple Heritage** portal.
• **Connecting with verified, background-checked Pandits** in your city.

How may I assist you with your devotional journey today?`;
    }

    return res.json({ success: true, reply, source: 'knowledge-base', model: 'Vedic Knowledge Base (Offline Failover)' });
  } catch (err: any) {
    console.error('Chat error:', err);
    return res.status(500).json({ success: false, reply: 'Unable to process question. Please try again.' });
  }
});

// Vite & Static Asset Handling
async function startServer() {
  const initialPort = parsePort();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  let currentPort = initialPort;
  let attempts = 0;
  const maxAttempts = 20;

  function tryListen() {
    const server = app.listen(currentPort, '0.0.0.0');

    server.on('listening', () => {
      console.log(`\n==================================================`);
      console.log(`[PoojaConnect Server] Active on Localhost & Network (All Ports Supported)`);
      console.log(`> Localhost: http://localhost:${currentPort}`);
      console.log(`> Loopback:  http://127.0.0.1:${currentPort}`);
      console.log(`> Network:   http://0.0.0.0:${currentPort}`);
      console.log(`==================================================\n`);
    });

    server.on('error', (err: any) => {
      // If running on local machine without fixed PORT and port is busy, auto-try next port
      if (err.code === 'EADDRINUSE' && attempts < maxAttempts && !process.env.PORT) {
        console.warn(`[Port Notice] Port ${currentPort} is already in use on localhost. Trying port ${currentPort + 1}...`);
        attempts++;
        currentPort++;
        tryListen();
      } else {
        console.error(`[Server Error] Could not start server on port ${currentPort}:`, err.message);
      }
    });
  }

  tryListen();
}

startServer();

