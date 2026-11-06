export function getLocationImageBlobPath(locationId: number): string {
  return `location-images/location-${locationId}.png`;
}

export function getLocationImageRootUrl(): string {
  const envUrl =
    process.env.LOCATION_IMAGE_BASE_URL ||
    process.env.NEXT_PUBLIC_LOCATION_IMAGE_BASE_URL;
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  return 'https://eivregtw0c7oknqs.public.blob.vercel-storage.com';
}

export function getLocationImageUrl(locationId: number): string {
  const rootUrl = getLocationImageRootUrl();
  const pathname = getLocationImageBlobPath(locationId);
  return `${rootUrl}/${pathname}`;
}
