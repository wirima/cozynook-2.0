import React, { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';

interface PrivacyPolicyProps {
    onBack: () => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
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
                <div className="text-xl font-serif font-bold text-slate-900">The Cozy Nook — Privacy Policy</div>
            </nav>

            <div className="pt-24 pb-16 px-6 max-w-4xl mx-auto">
                <div className="prose prose-slate max-w-none">
                    <h1 className="text-3xl font-serif font-bold mb-8 text-slate-900">Privacy Policy</h1>

                    <div className="space-y-8 text-slate-600 leading-relaxed">
                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-3">1. Introduction</h2>
                            <p>This Privacy Policy explains how The Cozy Nook collects, uses, and protects your personal information when you visit our website or stay at our property. All inquiries must be made through WhatsApp at +265 980 300054.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-3">2. Information We Collect</h2>
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-bold text-slate-800 mb-2">A. Information You Provide</h3>
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li>Name</li>
                                        <li>Email address</li>
                                        <li>Phone number</li>
                                        <li>Payment details (processed securely through third‑party providers)</li>
                                        <li>Booking details</li>
                                        <li>ID or passport information at check‑in (as required by law or for security)</li>
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 mb-2">B. Automatically Collected Information</h3>
                                    <p className="mb-2">Our website uses:</p>
                                    <ul className="list-disc pl-5 space-y-1 mb-2">
                                        <li>Google Analytics</li>
                                        <li>Standard cookies and tracking tools</li>
                                    </ul>
                                    <p className="mb-2">These tools may collect:</p>
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li>IP address</li>
                                        <li>Device information</li>
                                        <li>Browser type</li>
                                        <li>Pages visited</li>
                                        <li>Time spent on the site</li>
                                        <li>Referring websites</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-3">3. How We Use Your Information</h2>
                            <p className="mb-2">We use your information to:</p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>Process bookings and payments</li>
                                <li>Communicate with you about your stay</li>
                                <li>Verify identity at check‑in</li>
                                <li>Improve website performance and user experience</li>
                                <li>Comply with legal obligations</li>
                                <li>Enhance safety and security</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-3">4. Payment Processing</h2>
                            <p>Payments are handled by secure third‑party providers. The Cozy Nook does not store full credit card or mobile money details.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-3">5. Sharing of Information</h2>
                            <p className="mb-2">We may share your information only with:</p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>Payment processors</li>
                                <li>Law enforcement when required</li>
                                <li>Service providers assisting with operations (e.g., website hosting)</li>
                            </ul>
                            <p className="mt-2">We do not sell or rent your personal information.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-3">6. Data Retention</h2>
                            <p className="mb-2">We retain your information only as long as necessary for:</p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>Legal compliance</li>
                                <li>Booking history</li>
                                <li>Security and verification</li>
                                <li>Business operations</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-3">7. Security</h2>
                            <p>We take reasonable measures to protect your data, but no system is 100% secure. You acknowledge that data transmission over the internet carries inherent risks.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-3">8. Your Rights</h2>
                            <p className="mb-2">Malawian law, allow you the rights to:</p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>Access your personal data</li>
                                <li>Request corrections</li>
                                <li>Request deletion (where legally permitted)</li>
                                <li>Withdraw consent for marketing communications</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-3">9. Cookies & Tracking</h2>
                            <p>You may disable cookies in your browser settings, but some website features may not function properly.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-3">10. Third‑Party Links</h2>
                            <p>Our website may contain links to external sites. We are not responsible for their content or privacy practices.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-3">11. Updates to This Policy</h2>
                            <p>We may update this Privacy Policy from time to time. Changes will be posted on our website with the updated effective date.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-3">12. Contact</h2>
                            <p>For questions or requests related to privacy, contact us via WhatsApp at +265 980 300054.</p>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
