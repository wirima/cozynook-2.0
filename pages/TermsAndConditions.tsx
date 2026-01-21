import React, { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';

interface TermsAndConditionsProps {
  onBack: () => void;
}

const TermsAndConditions: React.FC<TermsAndConditionsProps> = ({ onBack }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <nav className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center">
        <button
          onClick={onBack}
          className="mr-4 p-2 rounded-full hover:bg-slate-100 transition text-slate-600"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-xl font-serif font-bold text-slate-900">The Cozy Nook — Terms & Conditions</div>
      </nav>

      <div className="pt-24 pb-16 px-6 max-w-4xl mx-auto">
        <div className="prose prose-slate max-w-none">
          <h1 className="text-3xl font-serif font-bold mb-8 text-slate-900">Terms & Conditions</h1>

          <div className="space-y-8 text-slate-600 leading-relaxed">
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">1. Introduction</h2>
              <p>These Terms & Conditions govern all bookings, stays, and use of services provided by The Cozy Nook, located in Malawi. By making a reservation or staying at the property, you agree to these Terms. All inquiries must be made through WhatsApp at +265 980 300054.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">2. Booking & Payment</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>All bookings must be made online through our website.</li>
                <li>Payment is required in full at the time of booking.</li>
                <li>We accept major credit/debit cards, Airtel Money, Mpamba, PayChangu, and other supported mobile money platforms.</li>
                <li>You must be 18 years or older to make a booking.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">3. Check‑In & Check‑Out</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>Check‑in: From 3:00 PM</li>
                <li>Check‑out: Before 11:00 AM</li>
                <li>Early check‑in or late check‑out may be available upon request and may incur additional fees.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">4. Identification Requirements</h2>
              <p>Guests may be required to present a valid government‑issued ID or passport at check‑in for verification and security purposes.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">5. Cancellation & Refund Policy</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>Cancellations made within 24 hours of booking are free of charge.</li>
                <li>After 24 hours, cancellation fees may apply depending on the booking type and season.</li>
                <li>Approved refunds may take up to 6 business days to process.</li>
                <li>No‑shows are non‑refundable.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">6. House Rules</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>No parties or events unless explicitly approved.</li>
                <li>No smoking inside the property.</li>
                <li>Guests must respect noise levels and neighboring properties.</li>
                <li>Only registered guests are allowed on the premises.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">7. Liability & “Stay at Your Own Risk” Clause</h2>
              <p className="mb-2">The Cozy Nook takes reasonable steps to ensure guest safety, but:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Guests stay at the property at their own risk.</li>
                <li>The Cozy Nook is not liable for accidents, injuries, loss, theft, or damage to personal belongings.</li>
                <li>Guests are responsible for their own conduct and for any damage caused to the property during their stay.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">8. Property Access & Use</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>Guests renting individual rooms may share common areas with other guests.</li>
                <li>Guests renting the entire house have exclusive access during their stay.</li>
                <li>Unauthorized access to restricted areas is prohibited.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">9. Damage & Security Deposits</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>Guests are responsible for any damage caused during their stay.</li>
                <li>The Cozy Nook reserves the right to charge repair or replacement costs.</li>
                <li>Security deposits (if applicable) will be refunded after inspection.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">10. Privacy & Data Use</h2>
              <p>Your data is handled according to our Privacy Policy. By booking, you consent to the collection and use of your information as described there.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">11. Governing Law</h2>
              <p>These Terms are governed by the laws of Malawi. Any disputes shall be resolved under Malawian jurisdiction.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;
