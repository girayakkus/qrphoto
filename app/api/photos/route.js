import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function checkPin(request) {
  const pin = request.headers.get('x-organizer-pin');
  return Boolean(process.env.ORGANIZER_PIN) && pin === process.env.ORGANIZER_PIN;
}

export async function GET(request) {
  if (!checkPin(request)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const folder = process.env.CLOUDINARY_FOLDER || 'nisan-fotograflari';
    const result = await cloudinary.search
      .expression(`folder:${folder}`)
      .sort_by('created_at', 'desc')
      .max_results(500)
      .with_field('context')
      .execute();

    const photos = (result.resources || []).map((r) => ({
      public_id: r.public_id,
      secure_url: r.secure_url,
      thumb_url: r.secure_url.replace('/upload/', '/upload/w_400,h_400,c_fill,q_auto/'),
      width: r.width,
      height: r.height,
      format: r.format,
      bytes: r.bytes,
      created_at: r.created_at,
      uploader: r.context?.custom?.uploader || '',
    }));

    return Response.json({ photos });
  } catch (err) {
    console.error('Cloudinary list error:', err);
    return Response.json({ error: 'server_error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  if (!checkPin(request)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const { public_id } = await request.json();
    if (!public_id) {
      return Response.json({ error: 'missing public_id' }, { status: 400 });
    }
    await cloudinary.uploader.destroy(public_id);
    return Response.json({ ok: true });
  } catch (err) {
    console.error('Cloudinary delete error:', err);
    return Response.json({ error: 'server_error' }, { status: 500 });
  }
}
