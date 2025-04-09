import React from 'react'

export default function TermsPage() {
  return (
    <div className="container max-w-4xl py-12">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      
      <div className="prose prose-lg dark:prose-invert">
        <p>
          Welcome to ReelCritic. By accessing or using our service, you agree to be bound by these Terms of Service.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">Acceptance of Terms</h2>
        <p>
          By accessing or using the ReelCritic service, website, or any applications made available by ReelCritic, you agree to be bound by these terms.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">User Accounts</h2>
        <p>
          In order to use some features of our service, you must create an account. You are responsible for safeguarding your account credentials and for any activity that occurs under your account.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">User Content</h2>
        <p>
          Our service allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material. You are responsible for the content that you post to the service, including its legality, reliability, and appropriateness.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">Prohibited Uses</h2>
        <p>
          You may use our service only for lawful purposes and in accordance with these Terms. You agree not to use the service:
        </p>
        <ul className="list-disc pl-6 my-4">
          <li>In any way that violates any applicable law or regulation</li>
          <li>To impersonate or attempt to impersonate another user or person</li>
          <li>To engage in any conduct that restricts or inhibits anyone's use of the service</li>
          <li>To upload or transmit viruses or malicious code</li>
        </ul>
        
        <p className="text-sm text-muted-foreground mt-8">
          Last updated: {new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>
      </div>
    </div>
  )
} 