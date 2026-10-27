import { NextRequest, NextResponse } from 'next/server';
import {
  CatalogError,
  fetchCatalog,
} from '@/features/storefront/server-catalog';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  if (
    !(
      path.length === 1 &&
      ['config', 'categories', 'brands', 'products', 'delivery-availability'].includes(path[0])
    ) &&
    !(
      path.length === 2 &&
      path[0] === 'products' &&
      /^[a-zA-Z0-9_-]{1,320}$/.test(path[1])
    )
  ) {
    return NextResponse.json(
      { error: { message: 'Not found.' } },
      { status: 404 },
    );
  }
  try {
    // Tenant and store come only from server configuration, never from browser headers or query strings.
    const data = await fetchCatalog(
      path.map(encodeURIComponent).join('/'),
      Object.fromEntries(request.nextUrl.searchParams),
    );
    return NextResponse.json(
      { data },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          message:
            error instanceof CatalogError
              ? path[0] === 'delivery-availability' && error.status === 422
                ? 'Provide only a valid six-digit Indian PIN code.'
                : error.message
              : 'The store is temporarily unavailable.',
        },
      },
      {
        status: error instanceof CatalogError ? error.status : 503,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }
}
