import { SignIn } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import Link from 'next/link';
import { Shield, ArrowLeft } from 'lucide-react';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="p-4">
        <Link href="/" className="inline-flex items-center text-gray-400 hover:text-white transition">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
      </header>
      
      {/* Sign In Form */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-2xl text-white">VerifiAI</span>
            </Link>
          </div>
          
          <SignIn 
            appearance={{
              baseTheme: dark,
              variables: {
                colorPrimary: '#3b82f6',
                colorBackground: '#1f2937',
                colorInputBackground: '#374151',
                colorInputText: '#f9fafb',
                colorText: '#f9fafb',
                colorTextSecondary: '#d1d5db',
              },
              elements: {
                rootBox: 'w-full',
                card: 'bg-gray-800 border border-gray-700 shadow-2xl w-full',
                headerTitle: 'text-white font-bold',
                headerSubtitle: 'text-gray-300',
                socialButtonsBlockButton: 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600',
                socialButtonsBlockButtonText: 'text-white font-medium',
                dividerLine: 'bg-gray-600',
                dividerText: 'text-gray-400',
                formFieldLabel: 'text-gray-200 font-medium',
                formFieldInput: 'bg-gray-700 border-gray-600 text-white placeholder:text-gray-400',
                formButtonPrimary: 'bg-blue-600 hover:bg-blue-500 text-white font-semibold',
                footerAction: 'text-gray-300',
                footerActionLink: 'text-blue-400 hover:text-blue-300 font-medium',
                identityPreview: 'bg-gray-700 border-gray-600',
                identityPreviewText: 'text-white',
                identityPreviewEditButton: 'text-blue-400 hover:text-blue-300',
                formFieldInputShowPasswordButton: 'text-gray-400 hover:text-white',
                otpCodeFieldInput: 'bg-gray-700 border-gray-600 text-white',
                formResendCodeLink: 'text-blue-400 hover:text-blue-300',
                alert: 'bg-gray-700 border-gray-600 text-white',
                alertText: 'text-white',
              }
            }}
            path="/sign-in"
            routing="path"
            signUpUrl="/sign-up"
          />
        </div>
      </div>
    </div>
  );
}
