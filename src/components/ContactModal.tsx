import { useState } from 'react';
import { Mail, User, MessageSquare, Send, Instagram, Github, Linkedin, Twitter, MapPin, Phone, X } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Client-side validation
    if (!formData.name.trim()) {
      setErrorMessage('Name is required');
      return;
    }
    if (!formData.email.trim()) {
      setErrorMessage('Email is required');
      return;
    }
    if (!formData.subject.trim()) {
      setErrorMessage('Subject is required');
      return;
    }
    if (!formData.message.trim()) {
      setErrorMessage('Message is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('https://portfolio-backend-zphz.onrender.com/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSubmitting(false);
        setSubmitStatus('success');
        setFormData({ name: '', email: '', subject: '', message: '' });

        setTimeout(() => {
          setSubmitStatus('idle');
        }, 3000);
      } else {
        setIsSubmitting(false);
        setErrorMessage(data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Submit error:', error);
      setIsSubmitting(false);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send message');
    }
  };

  const socialLinks = [
    { icon: Instagram, label: 'Instagram', href: 'https://instagram.com/_exo_shivam', color: 'from-purple-500 to-pink-500' },
    { icon: Github, label: 'GitHub', href: 'https://github.com/exoshivam', color: 'from-gray-700 to-gray-900' },
    { icon: Linkedin, label: 'LinkedIn', href: 'https://linkedin.com/in/shivam-yadav2106', color: 'from-blue-600 to-blue-800' },
    { icon: Twitter, label: 'Twitter', href: 'https://twitter.com', color: 'from-blue-400 to-blue-600' },
  ];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-black border border-gray-300 dark:border-gray-800 rounded-2xl max-w-4xl w-full my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-300 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <div className="inline-block p-3 bg-gradient-to-br from-orange-500 to-pink-500 rounded-full">
              <Mail size={24} />
            </div>
            <h1 className="text-2xl font-light text-black dark:text-white">Get In Touch</h1>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-900 rounded-lg transition-colors text-black dark:text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 grid md:grid-cols-2 gap-8">
          {/* Left - Contact Info */}
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">Contact Information</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gradient-to-br from-orange-500 to-pink-500 rounded-lg flex-shrink-0">
                    <Mail size={16} />
                  </div>
                  <div>
                    <div className="text-gray-600 dark:text-gray-400 text-sm mb-1">Email</div>
                    <a href="mailto:contact@example.com" className="text-black dark:text-white hover:text-pink-600 dark:hover:text-pink-400 transition-colors">
                      contact@example.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gradient-to-br from-orange-500 to-pink-500 rounded-lg flex-shrink-0">
                    <Phone size={16} />
                  </div>
                  <div>
                    <div className="text-gray-600 dark:text-gray-400 text-sm mb-1">Phone</div>
                    <a href="tel:+1234567890" className="text-black dark:text-white hover:text-pink-600 dark:hover:text-pink-400 transition-colors">
                      +91 9205962970
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gradient-to-br from-orange-500 to-pink-500 rounded-lg flex-shrink-0">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <div className="text-gray-600 dark:text-gray-400 text-sm mb-1">Location</div>
                    <div className="text-black dark:text-white">San Francisco, CA</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3 text-black dark:text-white">Follow Me</h3>
              <div className="grid grid-cols-2 gap-2">
                {socialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2 p-2 bg-gradient-to-br ${social.color} rounded-lg hover:scale-105 transition-transform text-sm`}
                    >
                      <Icon size={16} />
                      <span className="font-medium">{social.label}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right - Contact Form */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">Send a Message</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Your Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg py-2 pl-10 pr-4 text-sm text-black dark:text-white focus:outline-none focus:border-pink-500 transition-colors placeholder-gray-400 dark:placeholder-gray-600"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg py-2 pl-10 pr-4 text-sm text-black dark:text-white focus:outline-none focus:border-pink-500 transition-colors placeholder-gray-400 dark:placeholder-gray-600"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Subject
                </label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg py-2 pl-10 pr-4 text-sm text-black dark:text-white focus:outline-none focus:border-pink-500 transition-colors placeholder-gray-400 dark:placeholder-gray-600"
                    placeholder="Project Inquiry"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={4}
                  className="w-full bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg py-2 px-4 text-sm text-black dark:text-white focus:outline-none focus:border-pink-500 transition-colors resize-none placeholder-gray-400 dark:placeholder-gray-600"
                  placeholder="Tell me about your project..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-orange-500 to-pink-500 rounded-lg py-2 font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Send Message
                  </>
                )}
              </button>

              {errorMessage && (
                <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 text-center text-red-400 text-sm">
                  {errorMessage}
                </div>
              )}

              {submitStatus === 'success' && (
                <div className="bg-green-500/10 border border-green-500 rounded-lg p-3 text-center text-green-400 text-sm">
                  Message sent successfully! I'll get back to you soon.
                </div>
              )}

              {submitStatus === 'error' && (
                <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 text-center text-red-400 text-sm">
                  Failed to send message. Please try again or use the email provided.
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
