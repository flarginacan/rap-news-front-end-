import Header from '@/components/Header'
import Footer from '@/components/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for RAP NEWS - Learn how we collect, use, and protect your personal information.',
  robots: {
    index: true,
    follow: true,
  },
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="pt-16 md:pt-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12">
          <h1 className="text-4xl md:text-5xl font-black text-black mb-6">Privacy Policy</h1>
          <p className="text-gray-600 mb-8">Last updated: January 15, 2026</p>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-black mb-4">1. Introduction</h2>
              <p className="text-gray-700 mb-4">
                Welcome to RAP NEWS ("we," "our," or "us"). We are committed to protecting your privacy. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information 
                when you visit our website <a href="https://rapnews.com" className="text-red-600 hover:underline">rapnews.com</a>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-black mb-4">2. Information We Collect</h2>
              <h3 className="text-xl font-semibold text-black mb-3">2.1 Automatically Collected Information</h3>
              <p className="text-gray-700 mb-4">
                When you visit our website, we automatically collect certain information about your device, including:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li>IP address</li>
                <li>Browser type and version</li>
                <li>Operating system</li>
                <li>Pages you visit and time spent on pages</li>
                <li>Referring website addresses</li>
                <li>Date and time of your visit</li>
              </ul>
              <h3 className="text-xl font-semibold text-black mb-3">2.2 Cookies and Tracking Technologies</h3>
              <p className="text-gray-700 mb-4">
                We use cookies and similar tracking technologies to track activity on our website and store certain information. 
                Cookies are files with a small amount of data that may include an anonymous unique identifier.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-black mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-700 mb-4">We use the information we collect to:</p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li>Provide, maintain, and improve our website</li>
                <li>Analyze website usage and trends</li>
                <li>Monitor and prevent technical issues</li>
                <li>Enhance user experience</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-black mb-4">4. Third-Party Services</h2>
              <p className="text-gray-700 mb-4">
                We use the following third-party services that may collect information about you:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li><strong>Vercel Analytics:</strong> We use Vercel Analytics to understand how visitors interact with our website. 
                This service collects anonymous usage data including page views, device information, and browser type.</li>
                <li><strong>WordPress:</strong> Our content is managed through WordPress, which may collect technical data 
                necessary for content delivery.</li>
                <li><strong>Getty Images:</strong> We use Getty Images for content licensing. Their embed scripts may 
                collect technical information for content delivery purposes.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-black mb-4">5. Data Security</h2>
              <p className="text-gray-700 mb-4">
                We implement appropriate technical and organizational security measures to protect your information. 
                However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot 
                guarantee absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-black mb-4">6. Your Rights</h2>
              <p className="text-gray-700 mb-4">
                Depending on your location, you may have certain rights regarding your personal information, including:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li>The right to access your personal information</li>
                <li>The right to request deletion of your personal information</li>
                <li>The right to object to processing of your personal information</li>
                <li>The right to data portability</li>
                <li>The right to withdraw consent</li>
              </ul>
              <p className="text-gray-700 mb-4">
                To exercise these rights, please contact us using the information provided in the "Contact Us" section below.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-black mb-4">7. Children's Privacy</h2>
              <p className="text-gray-700 mb-4">
                Our website is not intended for children under the age of 13. We do not knowingly collect personal 
                information from children under 13. If you are a parent or guardian and believe your child has provided 
                us with personal information, please contact us.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-black mb-4">8. Changes to This Privacy Policy</h2>
              <p className="text-gray-700 mb-4">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the 
                new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this 
                Privacy Policy periodically for any changes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-black mb-4">9. Contact Us</h2>
              <p className="text-gray-700 mb-4">
                If you have any questions about this Privacy Policy, please contact us:
              </p>
              <ul className="list-none text-gray-700 mb-4 space-y-2">
                <li><strong>Website:</strong> <a href="https://rapnews.com" className="text-red-600 hover:underline">rapnews.com</a></li>
              </ul>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
