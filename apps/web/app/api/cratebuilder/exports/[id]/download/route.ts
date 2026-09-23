import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { webConfig } from '@/lib/config';

type Ctx = { params: Promise<{ id: string }> };

/** Streams Excel export for admins (supports local buffer or S3 redirect). */
export async function GET(_request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'INTERNAL_API_SECRET is not configured' }, { status: 500 });
  }

  const { id } = await ctx.params;
  const res = await fetch(
    `${webConfig.apiUrl.replace(/\/$/, '')}/v1/cratebuilder/exports/${id}/download`,
    {
      headers: {
        'X-Internal-Secret': secret,
        'X-User-Id': session.user.id,
      },
      cache: 'no-store',
    }
  );

  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }
    if (data.url) {
      return NextResponse.redirect(data.url);
    }
    return NextResponse.json(data);
  }

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text || res.statusText }, { status: res.status });
  }

  const buf = await res.arrayBuffer();
  const filename =
    res.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] ??
    'mintmusic_cratebuilder.xlsx';

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
