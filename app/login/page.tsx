import { SignIn } from '@clerk/nextjs';

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-100 p-4">
      <SignIn
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'bg-gray-900 border border-gray-800',
          },
        }}
        routing="hash"
        fallbackRedirectUrl="/admin/dashboard"
      />
    </div>
  );
}
