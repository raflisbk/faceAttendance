'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ChartBarIcon,
  ClockIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  CameraIcon,
  QrCodeIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  StarIcon,
  PlayIcon,
  SparklesIcon,
  LightBulbIcon,
  TrophyIcon,
  GlobeAltIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const features = [
  {
    icon: ShieldCheckIcon,
    title: 'Enterprise Security',
    description: 'Military-grade encryption with SOC 2 compliance, GDPR readiness, and comprehensive audit trails for complete data protection.',
    stats: '99.99% Uptime',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    icon: LightBulbIcon,
    title: 'AI-Powered Recognition',
    description: 'Advanced machine learning algorithms with 99.8% accuracy, anti-spoofing protection, and real-time facial analysis.',
    stats: '<200ms Recognition',
    color: 'from-purple-500 to-pink-500'
  },
  {
    icon: ChartBarIcon,
    title: 'Advanced Analytics',
    description: 'Real-time dashboards, predictive insights, attendance patterns, and comprehensive reporting with data visualization.',
    stats: '50+ Reports',
    color: 'from-green-500 to-emerald-500'
  },
  {
    icon: GlobeAltIcon,
    title: 'Global Scale',
    description: 'Multi-campus support, cloud infrastructure, automatic backups, and 24/7 monitoring across multiple time zones.',
    stats: '100K+ Users',
    color: 'from-orange-500 to-red-500'
  },
  {
    icon: UserGroupIcon,
    title: 'Seamless Integration',
    description: 'Easy integration with existing systems, API access, single sign-on, and comprehensive user management.',
    stats: '100+ Integrations',
    color: 'from-indigo-500 to-blue-500'
  },
  {
    icon: TrophyIcon,
    title: 'Award-Winning Support',
    description: 'Dedicated customer success team, 24/7 technical support, comprehensive training, and best-in-class service.',
    stats: '98% Satisfaction',
    color: 'from-yellow-500 to-orange-500'
  }
]

const testimonials = [
  {
    name: 'Dr. Sarah Johnson',
    role: 'Academic Director',
    institution: 'Harvard University',
    quote: 'FaceAttend has transformed our attendance management completely. The accuracy and ease of use are unmatched.',
    rating: 5,
    avatar: '/testimonials/sarah.jpg'
  },
  {
    name: 'Michael Chen',
    role: 'IT Director',
    institution: 'Google Inc.',
    quote: 'The enterprise features and security standards exceed our expectations. Seamless integration with our existing systems.',
    rating: 5,
    avatar: '/testimonials/michael.jpg'
  },
  {
    name: 'Prof. Emma Williams',
    role: 'Department Head',
    institution: 'MIT',
    quote: 'Revolutionary technology that has streamlined our entire attendance workflow. Students and faculty love the simplicity.',
    rating: 5,
    avatar: '/testimonials/emma.jpg'
  }
]

const stats = [
  { value: '500+', label: 'Educational Institutions', icon: AcademicCapIcon },
  { value: '1M+', label: 'Daily Recognitions', icon: CameraIcon },
  { value: '99.8%', label: 'Accuracy Rate', icon: CheckCircleIcon },
  { value: '24/7', label: 'Global Support', icon: ShieldCheckIcon }
]

export default function HomePage() {
  return (
    <div className="min-h-screen clean-bg">
      {/* Responsive Enterprise Header */}
      <header className="header-professional">
        <div className="container-max">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-3 sm:space-x-4"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-md">
                <CameraIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">FaceAttend</h1>
                <p className="text-sm sm:text-base text-gray-600 font-medium">Enterprise Recognition Platform</p>
              </div>
            </motion.div>

            <nav className="hidden lg:flex items-center space-x-8">
              <a href="#features" className="nav-item">Features</a>
              <a href="#solutions" className="nav-item">Solutions</a>
              <a href="#testimonials" className="nav-item">Testimonials</a>
              <a href="#pricing" className="nav-item">Pricing</a>
              <a href="#contact" className="nav-item">Contact</a>
            </nav>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-3"
            >
              <Link href="/login">
                <Button className="btn-ghost">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button className="btn-primary group">
                  Get Started
                  <ArrowRightIcon className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Responsive Hero Section */}
      <section className="relative py-12 sm:py-16 lg:py-24 xl:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/30"></div>
        <div className="container-max relative">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="hero-content space-y-6 sm:space-y-8 lg:space-y-10"
            >
              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 rounded-full text-blue-700 text-sm font-semibold shadow-sm"
                >
                  <SparklesIcon className="w-4 h-4 mr-2" />
                  Trusted by 500+ Enterprise Institutions
                  <TrophyIcon className="w-4 h-4 ml-2" />
                </motion.div>

                <h1 className="heading-1 max-w-4xl">
                  <span className="text-gradient">Revolutionary</span> Face Recognition
                  <br />
                  <span className="text-gray-900">Attendance Platform</span>
                </h1>

                <p className="text-large max-w-3xl leading-relaxed font-medium">
                  Transform your institution with AI-powered attendance management.
                  Enterprise-grade security, real-time analytics, and seamless user experience
                  trusted by leading organizations worldwide.
                </p>
              </div>

              <div className="hero-buttons flex flex-col sm:flex-row gap-4 sm:gap-6">
                <Link href="/attendance/check-in" className="w-full sm:w-auto">
                  <Button className="btn-primary w-full sm:w-auto text-lg px-8 py-4 group hover-lift">
                    <CameraIcon className="w-4 h-4 mr-3" />
                    Start Recognition
                    <ArrowRightIcon className="w-4 h-4 ml-3 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/demo" className="w-full sm:w-auto">
                  <Button className="btn-secondary w-full sm:w-auto text-lg px-8 py-4 group">
                    <PlayIcon className="w-4 h-4 mr-3" />
                    Watch Demo
                    <ArrowRightIcon className="w-4 h-4 ml-3 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="hero-stats grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 pt-6 sm:pt-8"
              >
                {stats.map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8 + index * 0.1 }}
                    className="text-center p-4 sm:p-6 rounded-xl bg-white/70 backdrop-blur-sm border border-white/30 shadow-sm hover-lift"
                  >
                    <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mx-auto mb-3" />
                    <div className="text-2xl sm:text-3xl font-bold text-gray-900">{stat.value}</div>
                    <div className="text-sm sm:text-base text-gray-600 font-medium">{stat.label}</div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="relative"
            >
              {/* Premium Dashboard Showcase */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10 rounded-2xl sm:rounded-3xl blur-xl"></div>
                <div className="relative enterprise-card p-4 sm:p-6 lg:p-8 xl:p-12 hover-glow">
                  <div className="space-y-4 sm:space-y-6 lg:space-y-8">
                    {/* Dashboard Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                          <ChartBarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Live Analytics</h3>
                          <p className="text-sm sm:text-base text-gray-600">Real-time attendance monitoring</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200/60 rounded-full">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-semibold text-green-700">Live Data</span>
                      </div>
                    </div>

                    {/* Responsive Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="metric-card p-4 sm:p-6"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="p-1.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-md">
                            <UserGroupIcon className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+18%</span>
                        </div>
                        <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">2,847</div>
                        <div className="text-sm sm:text-base text-gray-600 font-medium">Active Students</div>
                      </motion.div>

                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="metric-card p-4 sm:p-6"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-green-600 rounded-md">
                            <AcademicCapIcon className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Live</span>
                        </div>
                        <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">247</div>
                        <div className="text-sm sm:text-base text-gray-600 font-medium">Active Classes</div>
                      </motion.div>
                    </div>

                    {/* Live Class Activity */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-gray-900">Recent Activity</h4>

                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1 }}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border border-blue-100/60 rounded-xl hover-lift"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                            <LightBulbIcon className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">Advanced AI & Machine Learning</div>
                            <div className="text-sm text-gray-600">Room Tech-101 • Prof. Johnson</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600">98.5%</div>
                          <div className="text-xs text-gray-500">Attendance</div>
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.2 }}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50/50 to-pink-50/50 border border-purple-100/60 rounded-xl hover-lift"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <ChartBarIcon className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">Data Science & Analytics</div>
                            <div className="text-sm text-gray-600">Room Data-205 • Dr. Chen</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600">96.8%</div>
                          <div className="text-xs text-gray-500">Attendance</div>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Premium Features Section */}
      <section id="features" className="py-24 lg:py-32 whiteboard-bg">
        <div className="container-max">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 rounded-full text-blue-700 text-sm font-semibold mb-6">
              <LightBulbIcon className="w-4 h-4 mr-2" />
              Enterprise-Grade Technology
            </div>
            <h2 className="heading-2 mb-6">
              <span className="text-gradient">Revolutionary Features</span><br />
              Built for Modern Education
            </h2>
            <p className="text-large max-w-4xl mx-auto leading-relaxed">
              Experience the next generation of attendance management with AI-powered recognition,
              enterprise security, and real-time analytics designed for institutions of any scale.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 xl:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group relative"
              >
                <div className="relative enterprise-card p-8 hover-lift">
                  {/* Gradient Background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`}></div>

                  <div className="relative space-y-6">
                    {/* Icon with gradient */}
                    <div className="relative">
                      <div className={`w-10 h-10 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-300`}>
                        <feature.icon className="w-5 h-5 text-white" />
                      </div>
                      <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} rounded-xl blur-lg opacity-10 group-hover:opacity-20 transition-opacity duration-300`}></div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-2xl font-bold text-gray-900 group-hover:text-gray-800 transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>

                    {/* Stats Badge */}
                    <div className="flex items-center justify-between pt-6 border-t border-gray-100/60">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 bg-gradient-to-r ${feature.color} rounded-full`}></div>
                        <span className="text-lg font-bold text-gray-900">{feature.stats}</span>
                      </div>
                      <ArrowRightIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Feature Highlights */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
            className="mt-20 text-center"
          >
            <div className="inline-flex items-center space-x-8 p-6 bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-2xl shadow-lg">
              <div className="flex items-center space-x-2">
                <CheckCircleIcon className="w-4 h-4 text-green-600" />
                <span className="font-semibold text-gray-900">SOC 2 Compliant</span>
              </div>
              <div className="w-px h-6 bg-gray-200"></div>
              <div className="flex items-center space-x-2">
                <ShieldCheckIcon className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-gray-900">GDPR Ready</span>
              </div>
              <div className="w-px h-6 bg-gray-200"></div>
              <div className="flex items-center space-x-2">
                <StarIcon className="w-4 h-4 text-yellow-500" />
                <span className="font-semibold text-gray-900">99.9% Uptime</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20">
        <div className="container-max">
          <div className="text-center mb-16">
            <h2 className="heading-2 mb-4">Trusted by Leading Institutions</h2>
            <p className="text-xl text-muted">
              See what education leaders are saying about FaceAttend
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="enterprise-card p-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center space-x-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <StarIcon key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                    ))}
                  </div>

                  <blockquote className="text-gray-700 italic">
                    "{testimonial.quote}"
                  </blockquote>

                  <div className="pt-4 border-t border-gray-100">
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-muted">{testimonial.role}</div>
                    <div className="text-sm text-blue-600">{testimonial.institution}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="container-max">
          <div className="text-center text-white">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <h2 className="text-4xl font-bold">Ready to Transform Your Institution?</h2>
              <p className="text-xl text-blue-100 max-w-2xl mx-auto">
                Join thousands of educational institutions already using FaceAttend for seamless attendance management.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/register">
                  <Button className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-4 font-semibold">
                    Start Free Trial
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button className="border-2 border-white text-white hover:bg-white hover:text-blue-600 text-lg px-8 py-4 font-semibold bg-transparent">
                    Contact Sales
                  </Button>
                </Link>
              </div>

              <div className="text-sm text-blue-200">
                No credit card required • 30-day free trial • Enterprise support included
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-white">
        <div className="container-max">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center">
                  <CameraIcon className="w-3 h-3 text-white" />
                </div>
                <span className="text-lg font-bold">FaceAttend</span>
              </div>
              <p className="text-gray-400 text-sm">
                Enterprise-grade face recognition attendance system for modern educational institutions.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-sm text-gray-400">
                © 2024 FaceAttend. All rights reserved.
              </p>
              <div className="flex space-x-6 mt-4 md:mt-0">
                <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Terms</a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Privacy</a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Cookies</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}