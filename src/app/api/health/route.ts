import { NextResponse } from 'next/server';
import { getEnvironment } from '@/config/environment';
import { container } from '@/server/bootstrap/container';

export async function GET() {
  try {
    const config = await container.repository.getActiveConfig();
    return NextResponse.json({
      status: 'ready',
      dataProvider: getEnvironment().APP_DATA_PROVIDER,
      configVersion: config.version,
    });
  } catch {
    return NextResponse.json({ status: 'not-ready' }, { status: 503 });
  }
}
