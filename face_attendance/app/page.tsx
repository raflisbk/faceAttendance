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
    title: 'Security',
    description: 'Advanced encryption with SOC 2 compliance, GDPR readiness, and comprehensive audit trails for complete data protection.',
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
]



export default function HomePage() {
  return (
    <div className="min-h-screen clean-bg">
      {/* Responsive Enterprise Header */}
      <header className="header-professional">
        <div className="container-max">
          <div className="flex items-center justify-between h-16 sm:h-20 px-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center"
            >
              <Link href="/" className="no-underline">
                <h1 className="heading-pixel-2 hover-pixel cursor-pointer">FaceAttend</h1>
              </Link>
            </motion.div>

            <nav className="hidden lg:flex items-center space-x-8">
              <a href="#features" className="nav-item">Features</a>
              <a href="#solutions" className="nav-item">Solutions</a>
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
                <Button className="btn-ghost">
                  Get Started
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Header Separator */}
      <div className="w-full h-px bg-white pixel-shadow"></div>

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
              <div className="space-y-8 text-center lg:text-left max-w-5xl mx-auto lg:mx-0">

                <h1 className="heading-pixel-1 leading-tight">
                  <span className="text-foreground">Revolutionary</span>
                  <br />
                  <span className="text-foreground">Face Recognition</span>
                  <br />
                  <span className="text-foreground">Attendance Platform</span>
                </h1>

                <p className="text-pixel leading-relaxed max-w-4xl mx-auto lg:mx-0">
                  Transform your institution with AI-powered attendance management.
                  <br />
                  Enterprise-grade security, real-time analytics, and seamless user experience
                  <br />
                  trusted by leading organizations worldwide.
                </p>
              </div>


            </motion.div>

          </div>
        </div>
      </section>

      {/* Pixel Features Section */}
      <section id="features" className="space-pixel-xl">
        <div className="container-pixel">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="heading-pixel-1 mb-6">
              Features for
              Modern Education
            </h2>
            <p className="text-pixel max-w-4xl mx-auto">
              Next generation attendance management with AI-powered recognition,
              enterprise security, and real-time analytics.
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
                <div className="relative pixel-card hover-pixel">
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-100`}></div>

                  <div className="relative space-y-6">
                    <div className="relative">
                      <div className={`w-10 h-10 bg-foreground pixel-border flex items-center justify-center pixel-shadow group-hover:translate-x-1 group-hover:translate-y-1 transition-transform duration-100`}>
                        <feature.icon className="w-5 h-5 text-background" />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="heading-pixel-3 group-hover:text-foreground transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-pixel">
                        {feature.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-border">
                      <div className="flex items-center gap-pixel-xs">
                        <div className={`w-2 h-2 bg-foreground`}></div>
                        <span className="text-pixel">{feature.stats}</span>
                      </div>
                      <ArrowRightIcon className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all duration-100" />
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
            <div className="inline-flex items-center gap-pixel-lg pixel-frame">
              <div className="flex items-center gap-pixel-xs">
                <CheckCircleIcon className="w-4 h-4 text-foreground" />
                <span className="text-pixel">SOC 2 Compliant</span>
              </div>
              <div className="w-px h-6 bg-border"></div>
              <div className="flex items-center gap-pixel-xs">
                <ShieldCheckIcon className="w-4 h-4 text-foreground" />
                <span className="text-pixel">GDPR Ready</span>
              </div>
              <div className="w-px h-6 bg-border"></div>
              <div className="flex items-center gap-pixel-xs">
                <CheckCircleIcon className="w-4 h-4 text-foreground" />
                <span className="text-pixel">99.9% Uptime</span>
              </div>
            </div>
          </motion.div>

          {/* Start Recognition Button */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            viewport={{ once: true }}
            className="mt-64 text-center"
          >
            <Link href="/attendance/check-in">
              <Button className="btn-ghost">
                Start Recognition
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>



      {/* Footer */}
      <footer className="space-pixel-lg bg-card border-t border-border">
        <div className="container-pixel">
          <div className="flex items-center justify-center space-pixel-md">
            <div className="text-center">
              <a href="mailto:raflisbk@gmail.com" className="heading-pixel-3 hover-pixel">
                Contact Me
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}