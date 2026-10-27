import { redirect } from 'next/navigation';

// Keep older shopping links working; the live catalogue is on the homepage.
export default function SearchPage() {
  redirect('/#discover');
}
