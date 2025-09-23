import { Experiment } from './ab-testing';

export const DEFAULT_EXPERIMENTS: Experiment[] = [
  {
    id: 'login_form_test',
    name: 'Login Form Layout Test',
    description: 'Testing different login form layouts and button styles',
    status: 'active',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    variants: [
      {
        id: 'control',
        name: 'Original Vertical Layout',
        allocation: 34,
        config: {
          layout: 'vertical',
          buttonColor: '#3b82f6',
          buttonText: 'Sign In',
          showSocialLogin: true
        }
      },
      {
        id: 'variant_a',
        name: 'Horizontal Layout',
        allocation: 33,
        config: {
          layout: 'horizontal',
          buttonColor: '#10b981',
          buttonText: 'Login Now',
          showSocialLogin: true
        }
      },
      {
        id: 'variant_b',
        name: 'Modern Gradient',
        allocation: 33,
        config: {
          layout: 'gradient',
          buttonColor: 'gradient',
          buttonText: 'Continue',
          showSocialLogin: false
        }
      }
    ],
    targetAudience: {
      userTypes: ['student', 'lecturer', 'admin'],
      percentage: 100
    },
    conversionGoals: [
      {
        id: 'login_success',
        name: 'Successful Login',
        type: 'form_submit',
        value: 'login_form'
      },
      {
        id: 'social_login',
        name: 'Social Login Click',
        type: 'click',
        value: 'social_login_button'
      }
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },

  {
    id: 'dashboard_layout_test',
    name: 'Dashboard Layout Optimization',
    description: 'Testing different dashboard layouts for better user engagement',
    status: 'active',
    startDate: new Date('2024-01-15'),
    endDate: new Date('2024-06-30'),
    variants: [
      {
        id: 'control',
        name: 'Detailed Dashboard',
        allocation: 40,
        config: {
          layout: 'detailed',
          sidebarCollapsed: false,
          showQuickActions: true,
          cardStyle: 'detailed'
        }
      },
      {
        id: 'compact',
        name: 'Compact Dashboard',
        allocation: 30,
        config: {
          layout: 'compact',
          sidebarCollapsed: true,
          showQuickActions: false,
          cardStyle: 'compact'
        }
      },
      {
        id: 'card_grid',
        name: 'Card Grid Layout',
        allocation: 30,
        config: {
          layout: 'card_grid',
          sidebarCollapsed: false,
          showQuickActions: true,
          cardStyle: 'card_grid'
        }
      }
    ],
    targetAudience: {
      userTypes: ['lecturer', 'admin'],
      percentage: 80
    },
    conversionGoals: [
      {
        id: 'dashboard_interaction',
        name: 'Dashboard Interaction',
        type: 'click',
        value: 'dashboard_element'
      },
      {
        id: 'quick_action_usage',
        name: 'Quick Action Usage',
        type: 'click',
        value: 'quick_action_button'
      }
    ],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  },

  {
    id: 'cta_button_test',
    name: 'CTA Button Optimization',
    description: 'Testing different call-to-action button styles and copy',
    status: 'active',
    startDate: new Date('2024-02-01'),
    variants: [
      {
        id: 'control',
        name: 'Standard CTA',
        allocation: 33,
        config: {
          text: 'Start Attendance Check',
          color: 'blue',
          icon: 'camera',
          style: 'default'
        }
      },
      {
        id: 'urgent',
        name: 'Urgent CTA',
        allocation: 33,
        config: {
          text: 'Check In Now - Class Starting!',
          color: 'red',
          icon: 'users',
          style: 'urgent',
          animation: 'pulse'
        }
      },
      {
        id: 'minimal',
        name: 'Minimal CTA',
        allocation: 34,
        config: {
          text: 'Check Attendance',
          color: 'outline',
          icon: 'arrow-right',
          style: 'minimal'
        }
      }
    ],
    conversionGoals: [
      {
        id: 'cta_click',
        name: 'CTA Button Click',
        type: 'click',
        value: 'cta_button'
      },
      {
        id: 'attendance_started',
        name: 'Attendance Check Started',
        type: 'custom',
        value: 'attendance_flow_start'
      }
    ],
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01')
  },

  {
    id: 'pricing_test',
    name: 'Pricing Page Layout',
    description: 'Testing simplified vs detailed pricing layouts',
    status: 'active',
    startDate: new Date('2024-02-15'),
    variants: [
      {
        id: 'control',
        name: 'Standard 3-Tier Pricing',
        allocation: 50,
        config: {
          layout: 'three_tier',
          showFeatures: true,
          highlightPopular: true
        }
      },
      {
        id: 'simplified',
        name: 'Single Tier Focus',
        allocation: 50,
        config: {
          layout: 'single_tier',
          showFeatures: true,
          emphasizeValue: true,
          showTrial: true
        }
      }
    ],
    conversionGoals: [
      {
        id: 'plan_selected',
        name: 'Plan Selected',
        type: 'click',
        value: 'pricing_plan_button'
      },
      {
        id: 'trial_started',
        name: 'Trial Started',
        type: 'form_submit',
        value: 'trial_signup_form'
      }
    ],
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-02-15')
  },

  {
    id: 'newsletter_test',
    name: 'Newsletter Signup Optimization',
    description: 'Testing newsletter signup copy and design',
    status: 'active',
    startDate: new Date('2024-03-01'),
    variants: [
      {
        id: 'control',
        name: 'Simple Newsletter Signup',
        allocation: 50,
        config: {
          style: 'simple',
          headline: 'Stay Updated',
          copy: 'Subscribe to our newsletter for the latest updates and features.',
          button: 'Subscribe'
        }
      },
      {
        id: 'benefit',
        name: 'Benefit-Focused Signup',
        allocation: 50,
        config: {
          style: 'benefit_focused',
          headline: '🚀 Get Exclusive Access',
          showBenefits: true,
          button: 'Join Now',
          guarantee: 'No spam, unsubscribe anytime'
        }
      }
    ],
    conversionGoals: [
      {
        id: 'newsletter_signup',
        name: 'Newsletter Signup',
        type: 'form_submit',
        value: 'newsletter_form'
      }
    ],
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-01')
  },

  {
    id: 'feature_flags_test',
    name: 'Beta Features Access',
    description: 'Gradual rollout of beta features to test user adoption',
    status: 'active',
    startDate: new Date('2024-03-15'),
    variants: [
      {
        id: 'control',
        name: 'Standard Features',
        allocation: 70,
        config: {
          betaFeatures: false,
          advancedAnalytics: false,
          predictiveModeling: false
        }
      },
      {
        id: 'beta_features',
        name: 'Beta Features Enabled',
        allocation: 30,
        config: {
          betaFeatures: true,
          advancedAnalytics: true,
          predictiveModeling: true
        }
      }
    ],
    targetAudience: {
      userTypes: ['admin', 'lecturer'],
      percentage: 50
    },
    conversionGoals: [
      {
        id: 'beta_feature_usage',
        name: 'Beta Feature Usage',
        type: 'click',
        value: 'beta_feature_button'
      },
      {
        id: 'advanced_analytics_view',
        name: 'Advanced Analytics View',
        type: 'page_view',
        value: 'advanced_analytics_page'
      }
    ],
    createdAt: new Date('2024-03-15'),
    updatedAt: new Date('2024-03-15')
  },

  {
    id: 'button_style_test',
    name: 'Button Style Test',
    description: 'Testing different button styles across the application',
    status: 'draft',
    variants: [
      {
        id: 'control',
        name: 'Default Button Style',
        allocation: 50,
        config: {
          style: 'default',
          borderRadius: '0.375rem',
          shadow: 'sm'
        }
      },
      {
        id: 'enhanced',
        name: 'Enhanced Button Style',
        allocation: 50,
        config: {
          style: 'enhanced',
          borderRadius: '0.75rem',
          shadow: 'lg',
          gradient: true
        }
      }
    ],
    conversionGoals: [
      {
        id: 'button_interaction',
        name: 'Button Interaction',
        type: 'click',
        value: 'enhanced_button'
      }
    ],
    createdAt: new Date('2024-03-20'),
    updatedAt: new Date('2024-03-20')
  }
];