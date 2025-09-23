import { NextRequest, NextResponse } from 'next/server';

const variantConfigs = new Map<string, any>();

variantConfigs.set('login_form_test:control', {
  buttonColor: '#3b82f6',
  buttonText: 'Sign In',
  showSocialLogin: true,
  formLayout: 'vertical'
});

variantConfigs.set('login_form_test:variant_a', {
  buttonColor: '#10b981',
  buttonText: 'Login Now',
  showSocialLogin: true,
  formLayout: 'horizontal'
});

variantConfigs.set('dashboard_layout_test:control', {
  sidebarCollapsed: false,
  showQuickActions: true,
  cardStyle: 'default',
  theme: 'light'
});

variantConfigs.set('dashboard_layout_test:variant_a', {
  sidebarCollapsed: true,
  showQuickActions: false,
  cardStyle: 'compact',
  theme: 'light'
});

export async function GET(
  request: NextRequest,
  { params }: { params: { experimentId: string; variantId: string } }
) {
  try {
    const { experimentId, variantId } = params;
    const key = `${experimentId}:${variantId}`;
    const config = variantConfigs.get(key);

    if (!config) {
      return NextResponse.json(
        { error: 'Config not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch config' },
      { status: 500 }
    );
  }
}