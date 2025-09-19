# 📧 Email Service Setup - Resend Integration

## Panduan Lengkap Setup Email Service dengan Resend untuk Face Attendance System

### 🚀 **1. Setup Akun Resend**

1. **Daftar Akun**
   - Kunjungi [resend.com](https://resend.com)
   - Daftar dengan email atau GitHub
   - Verifikasi email Anda

2. **Verifikasi Domain (Opsional untuk Production)**
   - Login ke dashboard Resend
   - Pilih **Domains** di sidebar
   - Klik **Add Domain**
   - Masukkan domain Anda (contoh: `yourdomain.com`)
   - Ikuti instruksi DNS setup
   - Tunggu verifikasi (biasanya 5-10 menit)

3. **Generate API Key**
   - Di dashboard, pilih **API Keys**
   - Klik **Create API Key**
   - Beri nama: `Face Attendance System`
   - Copy API key yang dihasilkan

### 📝 **2. Environment Configuration**

Tambahkan konfigurasi berikut ke file `.env`:

```env
# Email Service (Resend)
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxxx"
FROM_EMAIL="noreply@yourdomain.com"
ADMIN_EMAIL="admin@yourdomain.com"
APP_NAME="Face Attendance System"
APP_URL="http://localhost:3000"
```

**Catatan untuk Development:**
- Jika belum punya domain sendiri, gunakan email test dari Resend
- Resend menyediakan domain `onboarding.resend.dev` untuk testing

### 🔧 **3. Installation & Setup**

1. **Install Resend Package**
   ```bash
   npm install resend
   ```

2. **Restart Development Server**
   ```bash
   npm run dev
   ```

### 📨 **4. Fitur Email yang Tersedia**

#### **A. Email Verification**
```typescript
import { sendVerificationEmail } from '@/lib/email'

// Kirim email verifikasi setelah registrasi
await sendVerificationEmail(user.email, verificationToken)
```

#### **B. Password Reset**
```typescript
import { sendPasswordResetEmail } from '@/lib/email'

// Kirim email reset password
await sendPasswordResetEmail(user.email, resetToken)
```

#### **C. Account Approval**
```typescript
import { sendApprovalEmail } from '@/lib/email'

// Kirim notifikasi persetujuan akun
await sendApprovalEmail(user.email, user.name)
```

#### **D. Attendance Notifications**
```typescript
import { sendAttendanceNotification } from '@/lib/email'

// Kirim notifikasi kehadiran
await sendAttendanceNotification(
  student.email,
  student.name,
  class.name,
  'PRESENT',
  new Date()
)
```

### 🎨 **5. Customization Email Templates**

Email templates dapat dikustomisasi di file `lib/email.ts`:

```typescript
// Contoh custom template
function createCustomVerificationTemplate(token: string) {
  return {
    subject: 'Verify Your Face Attendance Account',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial;">
        <h1>Welcome to Face Attendance System!</h1>
        <p>Click the button below to verify your email:</p>
        <a href="${process.env.APP_URL}/verify?token=${token}"
           style="background: #3b82f6; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 5px;">
          Verify Email
        </a>
      </div>
    `,
    text: `Verify your email: ${process.env.APP_URL}/verify?token=${token}`
  }
}
```

### 🔒 **6. Testing Email Service**

#### **Development Mode**
Dalam mode development, email akan ditampilkan di console:

```bash
📧 Mock Email Sent:
To: user@example.com
Subject: Welcome to Face Attendance System
Content: <!DOCTYPE html><html>...
```

#### **Production Mode**
Dengan RESEND_API_KEY yang valid, email akan benar-benar terkirim.

#### **Manual Testing**
```typescript
// Test di API route atau server action
import { EmailService, ResendEmailProvider } from '@/lib/email'

const emailService = new EmailService(new ResendEmailProvider())

const result = await emailService.sendEmail({
  to: 'test@example.com',
  subject: 'Test Email',
  html: '<h1>Test berhasil!</h1>',
  text: 'Test berhasil!'
})

console.log('Email result:', result)
```

### 🚨 **7. Error Handling**

Email service sudah dilengkapi error handling:

```typescript
const result = await sendVerificationEmail(email, token)

if (!result) {
  console.warn('Failed to send verification email')
  // Handle fallback atau retry logic
}
```

### 📊 **8. Monitoring & Analytics**

#### **Resend Dashboard**
- Login ke dashboard Resend
- Lihat statistik email terkirim
- Monitor bounce rate dan deliverability

#### **Application Logs**
```typescript
// Email success
console.log('Email sent successfully:', data.id)

// Email failure
console.error('Email sending failed:', error)
```

### 🔧 **9. Advanced Configuration**

#### **Custom Email Provider**
```typescript
import { EmailProvider, EmailOptions } from '@/lib/email'

class CustomEmailProvider implements EmailProvider {
  async sendEmail(options: EmailOptions) {
    // Implementasi custom provider
    // Bisa menggunakan SendGrid, Mailgun, dll
  }
}

// Gunakan provider custom
const customService = new EmailService(new CustomEmailProvider())
```

#### **Bulk Email Sending**
```typescript
import { sendClassReminders } from '@/lib/email-examples'

// Kirim reminder ke semua siswa
const result = await sendClassReminders()
console.log(`Sent ${result.successful} reminders`)
```

#### **Email Queuing (Advanced)**
Untuk high-volume emails, gunakan queue system:

```typescript
// Gunakan Bull Queue atau Agenda.js
import Queue from 'bull'

const emailQueue = new Queue('email processing')

emailQueue.process(async (job) => {
  const { to, subject, html } = job.data
  return await sendEmail({ to, subject, html })
})

// Add job to queue
emailQueue.add('send-email', {
  to: 'user@example.com',
  subject: 'Queued Email',
  html: '<h1>Hello!</h1>'
})
```

### 🌟 **10. Best Practices**

1. **Rate Limiting**
   - Resend free tier: 100 emails/day
   - Implement rate limiting untuk mencegah spam

2. **Email Validation**
   ```typescript
   import validator from 'validator'

   if (!validator.isEmail(email)) {
     throw new Error('Invalid email format')
   }
   ```

3. **Unsubscribe Links**
   ```html
   <p>
     <a href="${APP_URL}/unsubscribe?token=${unsubscribeToken}">
       Unsubscribe from notifications
     </a>
   </p>
   ```

4. **Email Preferences**
   - Biarkan user mengatur preferensi email
   - Simpan di database user preferences

### 🐛 **11. Troubleshooting**

#### **Common Issues:**

1. **API Key Invalid**
   ```
   Error: Invalid API key
   ```
   - Pastikan RESEND_API_KEY benar
   - Regenerate API key di dashboard

2. **Domain Not Verified**
   ```
   Error: Domain not verified
   ```
   - Gunakan domain test: `onboarding.resend.dev`
   - Atau setup DNS records untuk domain sendiri

3. **Rate Limit Exceeded**
   ```
   Error: Rate limit exceeded
   ```
   - Upgrade plan Resend
   - Implement email queuing

4. **Email Tidak Terkirim**
   - Check spam folder
   - Verify email address valid
   - Check Resend dashboard untuk logs

### 📞 **Support**

- **Resend Documentation:** [resend.com/docs](https://resend.com/docs)
- **Resend Discord:** [discord.gg/resend](https://discord.gg/resend)
- **GitHub Issues:** [github.com/your-repo/issues](https://github.com/your-repo/issues)

---

## ✅ **Quick Setup Checklist**

- [ ] Daftar akun Resend
- [ ] Generate API key
- [ ] Setup environment variables
- [ ] Install `resend` package
- [ ] Test email functionality
- [ ] Customize email templates
- [ ] Setup monitoring
- [ ] Deploy to production

**Selamat! Email service Face Attendance System siap digunakan! 🎉**