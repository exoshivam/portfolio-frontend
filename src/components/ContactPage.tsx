import { useState } from 'react';
import { Mail, User, MessageSquare, Send, Instagram, Github, Linkedin, Twitter, MapPin, Phone } from 'lucide-react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    await new Promise(resolve => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    setSubmitStatus('success');
    setFormData({ name: '', email: '', subject: '', message: '' });

    setTimeout(() => setSubmitStatus('idle'), 3000);
  };

  const socialLinks = [
    { icon: Instagram, label: 'Instagram', href: 'https://instagram.com', color: 'from-purple-500 to-pink-500' },
    { icon: Github, label: 'GitHub', href: 'https://github.com', color: 'from-gray-700 to-gray-900' },
    { icon: Linkedin, label: 'LinkedIn', href: 'https://linkedin.com', color: 'from-blue-600 to-blue-800' },
    { icon: Twitter, label: 'Twitter', href: 'https://twitter.com', color: 'from-blue-400 to-blue-600' },
  ];

  return (
    <div className="min-h-screen bg-black text-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-block p-3 bg-gradient-to-br from-orange-500 to-pink-500 rounded-full mb-4">
            <Mail size={32} />
          </div>
          <h1 className="text-4xl md:text-5xl font-light mb-4">Get In Touch</h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Have a question or want to work together? Feel free to reach out!
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl p-8">
              <h2 className="text-2xl font-semibold mb-6">Contact Information</h2>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-gradient-to-br from-orange-500 to-pink-500 rounded-lg">
                    <Mail size={20} />
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Email</div>
                    <a href="mailto:contact@example.com" className="hover:text-pink-400 transition-colors">
                      contact@example.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-2 bg-gradient-to-br from-orange-500 to-pink-500 rounded-lg">
                    <Phone size={20} />
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Phone</div>
                    <a href="tel:+1234567890" className="hover:text-pink-400 transition-colors">
                      +1 (234) 567-890
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-2 bg-gradient-to-br from-orange-500 to-pink-500 rounded-lg">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Location</div>
                    <div>San Francisco, CA</div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-800">
                <h3 className="text-lg font-semibold mb-4">Follow Me</h3>
                <div className="grid grid-cols-2 gap-3">
                  {socialLinks.map((social) => {
                    const Icon = social.icon;
                    return (
                      <a
                        key={social.label}
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-3 p-3 bg-gradient-to-br ${social.color} rounded-lg hover:scale-105 transition-transform`}
                      >
                        <Icon size={20} />
                        <span className="text-sm font-medium">{social.label}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 rounded-2xl p-8 text-center">
              <h3 className="text-2xl font-bold mb-2">Let's Create Something Amazing</h3>
              <p className="text-white/90">
                I'm always open to discussing new projects and creative ideas.
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl p-8">
            <h2 className="text-2xl font-semibold mb-6">Send a Message</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-2">
                  Your Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full bg-black border border-gray-700 rounded-lg py-3 pl-12 pr-4 focus:outline-none focus:border-pink-500 transition-colors"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full bg-black border border-gray-700 rounded-lg py-3 pl-12 pr-4 focus:outline-none focus:border-pink-500 transition-colors"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-400 mb-2">
                  Subject
                </label>
                <div className="relative">
                  <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full bg-black border border-gray-700 rounded-lg py-3 pl-12 pr-4 focus:outline-none focus:border-pink-500 transition-colors"
                    placeholder="Project Inquiry"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-400 mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="w-full bg-black border border-gray-700 rounded-lg py-3 px-4 focus:outline-none focus:border-pink-500 transition-colors resize-none"
                  placeholder="Tell me about your project..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-orange-500 to-pink-500 rounded-lg py-3 font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Send Message
                  </>
                )}
              </button>

              {submitStatus === 'success' && (
                <div className="bg-green-500/10 border border-green-500 rounded-lg p-4 text-center text-green-400">
                  Message sent successfully! I'll get back to you soon.
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
