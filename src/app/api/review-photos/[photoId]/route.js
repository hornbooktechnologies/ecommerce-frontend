import {publicPhotoProxy} from '@/lib/review-photo-proxy';
export async function GET(request,context){const {photoId}=await context.params;return publicPhotoProxy(request,photoId);}
