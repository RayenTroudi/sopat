import { redirect } from 'next/navigation'

// Canonical login page is now at /login
export default function AdminLoginRedirect() {
  redirect('/login')
}
