import React from 'react'

export default function PrivacyPage() {
  return (
    <div className="container max-w-4xl py-12">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      
      <div className="prose prose-lg dark:prose-invert">
        <p>
          At ReelCritic, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">Information We Collect</h2>
        <p>
          We collect information that you provide directly to us when you:
        </p>
        <ul className="list-disc pl-6 my-4">
          <li>Create an account</li>
          <li>Update your profile</li>
          <li>Post reviews or comments</li>
          <li>Interact with other users</li>
          <li>Contact customer support</li>
        </ul>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">How We Use Your Information</h2>
        <p>
          We use the information we collect to:
        </p>
        <ul className="list-disc pl-6 my-4">
          <li>Provide, maintain, and improve our services</li>
          <li>Process transactions</li>
          <li>Send you technical notices and support messages</li>
          <li>Respond to your comments and questions</li>
          <li>Develop new products and services</li>
        </ul>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy, please contact us at privacy@reelcritic.com.
        </p>
        
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