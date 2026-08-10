import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect root to dashboard (middleware handles auth checking)
  redirect('/dashboard');
}
