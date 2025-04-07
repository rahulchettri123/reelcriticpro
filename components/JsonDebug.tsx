"use client";

import React from 'react';

interface JsonDebugProps {
  data: any;
  title?: string;
}

export default function JsonDebug({ data, title }: JsonDebugProps) {
  return (
    <div className="bg-black rounded-md p-4 my-4 overflow-auto">
      {title && <h3 className="text-white text-lg mb-2">{title}</h3>}
      <pre className="text-green-400 text-sm">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
} 