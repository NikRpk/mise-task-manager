'use client';

import { Plus, Search, Menu } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

export default function DesignOptionsPage() {
  const [currentView, setCurrentView] = useState('tasks');

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#f8fafc' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900 mb-4 inline-block">
            ← Back to App
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mise Logo Design Options</h1>
          <p className="text-gray-600">Compare 10 different design variations for the header bar</p>
        </div>

        <div className="space-y-8">
          {/* Option 1: Minimalist Left Logo */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-700">Option 1: Minimalist Left Logo (Inter + Thin Weight)</h2>
            <div className="rounded-xl border shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex justify-between items-center px-5 py-3" style={{ borderBottom: '3px solid var(--color-primary)' }}>
                <div className="flex items-center gap-4 flex-1">
                  <h1 className="text-lg font-light tracking-wide" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--color-text)' }}>
                    mise
                  </h1>
                  <div className="w-px h-6 bg-gray-300"></div>
                  <div className="inline-flex items-center bg-gray-100 rounded-full p-1">
                    <button
                      className="px-3 py-1 text-sm rounded-full transition-all duration-200"
                      style={{ 
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        fontWeight: 600
                      }}
                    >
                      Tasks
                    </button>
                    <button className="px-3 py-1 text-sm rounded-full">
                      Notes
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button className="px-3 py-1.5 text-sm border rounded-md flex items-center gap-2">
                    <Search size={16} />
                    Search
                  </button>
                  <button className="px-3 py-1.5 text-sm rounded-md flex items-center gap-2 text-white" style={{ backgroundColor: 'var(--color-primary)' }}>
                    <Plus size={16} />
                    New Task
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Option 2: Bold Serif Brand */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-700">Option 2: Bold Serif Brand (Playfair Display)</h2>
            <div className="rounded-xl border shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex justify-between items-center px-5 py-3" style={{ borderBottom: '3px solid var(--color-primary)' }}>
                <div className="flex items-center gap-3 flex-1">
                  <h1 className="text-xl font-bold italic" style={{ fontFamily: '"Playfair Display", serif', color: 'var(--color-primary)' }}>
                    Mise
                  </h1>
                  <div className="inline-flex items-center bg-gray-100 rounded-full p-1">
                    <button
                      className="px-3 py-1 text-sm rounded-full transition-all duration-200"
                      style={{ 
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        fontWeight: 600
                      }}
                    >
                      Tasks
                    </button>
                    <button className="px-3 py-1 text-sm rounded-full">
                      Notes
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button className="px-3 py-1.5 text-sm border rounded-md flex items-center gap-2">
                    <Search size={16} />
                    Search
                  </button>
                  <button className="px-3 py-1.5 text-sm rounded-md flex items-center gap-2 text-white" style={{ backgroundColor: 'var(--color-primary)' }}>
                    <Plus size={16} />
                    New Task
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Option 3: Monospace Tech */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-700">Option 3: Monospace Tech (JetBrains Mono)</h2>
            <div className="rounded-xl border shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex justify-between items-center px-5 py-3" style={{ borderBottom: '3px solid var(--color-primary)' }}>
                <div className="flex items-center gap-3 flex-1">
                  <div className="px-2 py-1 rounded border-2" style={{ borderColor: 'var(--color-primary)' }}>
                    <span className="text-sm font-bold" style={{ fontFamily: '"JetBrains Mono", monospace', color: 'var(--color-primary)' }}>
                      MISE
                    </span>
                  </div>
                  <div className="inline-flex items-center bg-gray-100 rounded-full p-1">
                    <button
                      className="px-3 py-1 text-sm rounded-full transition-all duration-200"
                      style={{ 
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        fontWeight: 600
                      }}
                    >
                      Tasks
                    </button>
                    <button className="px-3 py-1 text-sm rounded-full">
                      Notes
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button className="px-3 py-1.5 text-sm border rounded-md flex items-center gap-2">
                    <Search size={16} />
                    Search
                  </button>
                  <button className="px-3 py-1.5 text-sm rounded-md flex items-center gap-2 text-white" style={{ backgroundColor: 'var(--color-primary)' }}>
                    <Plus size={16} />
                    New Task
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Option 4: Elegant Script */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-700">Option 4: Elegant Script (Dancing Script)</h2>
            <div className="rounded-xl border shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex justify-between items-center px-5 py-3" style={{ borderBottom: '3px solid var(--color-primary)' }}>
                <div className="flex items-center gap-4 flex-1">
                  <h1 className="text-2xl" style={{ fontFamily: '"Dancing Script", cursive', color: 'var(--color-primary)' }}>
                    Mise
                  </h1>
                  <div className="inline-flex items-center bg-gray-100 rounded-full p-1">
                    <button
                      className="px-3 py-1 text-sm rounded-full transition-all duration-200"
                      style={{ 
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        fontWeight: 600
                      }}
                    >
                      Tasks
                    </button>
                    <button className="px-3 py-1 text-sm rounded-full">
                      Notes
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button className="px-3 py-1.5 text-sm border rounded-md flex items-center gap-2">
                    <Search size={16} />
                    Search
                  </button>
                  <button className="px-3 py-1.5 text-sm rounded-md flex items-center gap-2 text-white" style={{ backgroundColor: 'var(--color-primary)' }}>
                    <Plus size={16} />
                    New Task
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Option 5: Uppercase Modern */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-700">Option 5: Uppercase Modern (Montserrat)</h2>
            <div className="rounded-xl border shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex justify-between items-center px-5 py-3" style={{ borderBottom: '3px solid var(--color-primary)' }}>
                <div className="flex items-center gap-3 flex-1">
                  <h1 className="text-sm font-extrabold tracking-widest uppercase" style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--color-text)', letterSpacing: '0.2em' }}>
                    MISE
                  </h1>
                  <div className="border-l-2 pl-3" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="inline-flex items-center bg-gray-100 rounded-full p-1">
                      <button
                        className="px-3 py-1 text-sm rounded-full transition-all duration-200"
                        style={{ 
                          backgroundColor: 'var(--color-primary)',
                          color: 'white',
                          fontWeight: 600
                        }}
                      >
                        Tasks
                      </button>
                      <button className="px-3 py-1 text-sm rounded-full">
                        Notes
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button className="px-3 py-1.5 text-sm border rounded-md flex items-center gap-2">
                    <Search size={16} />
                    Search
                  </button>
                  <button className="px-3 py-1.5 text-sm rounded-md flex items-center gap-2 text-white" style={{ backgroundColor: 'var(--color-primary)' }}>
                    <Plus size={16} />
                    New Task
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Option 6: Badge Style */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-700">Option 6: Badge Style (Poppins)</h2>
            <div className="rounded-xl border shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex justify-between items-center px-5 py-3" style={{ borderBottom: '3px solid var(--color-primary)' }}>
                <div className="flex items-center gap-3 flex-1">
                  <div className="px-3 py-1 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }}>
                    <span className="text-sm font-semibold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      Mise
                    </span>
                  </div>
                  <div className="inline-flex items-center bg-gray-100 rounded-full p-1">
                    <button
                      className="px-3 py-1 text-sm rounded-full transition-all duration-200"
                      style={{ 
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        fontWeight: 600
                      }}
                    >
                      Tasks
                    </button>
                    <button className="px-3 py-1 text-sm rounded-full">
                      Notes
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button className="px-3 py-1.5 text-sm border rounded-md flex items-center gap-2">
                    <Search size={16} />
                    Search
                  </button>
                  <button className="px-3 py-1.5 text-sm rounded-md flex items-center gap-2 text-white" style={{ backgroundColor: 'var(--color-primary)' }}>
                    <Plus size={16} />
                    New Task
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Option 7: Geometric Sans */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-700">Option 7: Geometric Sans (Raleway)</h2>
            <div className="rounded-xl border shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex justify-between items-center px-5 py-3" style={{ borderBottom: '3px solid var(--color-primary)' }}>
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }}></div>
                    <h1 className="text-lg font-semibold" style={{ fontFamily: 'Raleway, sans-serif', color: 'var(--color-text)' }}>
                      Mise
                    </h1>
                  </div>
                  <div className="inline-flex items-center bg-gray-100 rounded-full p-1">
                    <button
                      className="px-3 py-1 text-sm rounded-full transition-all duration-200"
                      style={{ 
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        fontWeight: 600
                      }}
                    >
                      Tasks
                    </button>
                    <button className="px-3 py-1 text-sm rounded-full">
                      Notes
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button className="px-3 py-1.5 text-sm border rounded-md flex items-center gap-2">
                    <Search size={16} />
                    Search
                  </button>
                  <button className="px-3 py-1.5 text-sm rounded-md flex items-center gap-2 text-white" style={{ backgroundColor: 'var(--color-primary)' }}>
                    <Plus size={16} />
                    New Task
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Option 8: Gradient Accent */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-700">Option 8: Gradient Accent (Space Grotesk)</h2>
            <div className="rounded-xl border shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex justify-between items-center px-5 py-3" style={{ borderBottom: '3px solid var(--color-primary)' }}>
                <div className="flex items-center gap-3 flex-1">
                  <h1 className="text-xl font-bold" style={{ 
                    fontFamily: '"Space Grotesk", sans-serif',
                    background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    Mise
                  </h1>
                  <div className="inline-flex items-center bg-gray-100 rounded-full p-1">
                    <button
                      className="px-3 py-1 text-sm rounded-full transition-all duration-200"
                      style={{ 
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        fontWeight: 600
                      }}
                    >
                      Tasks
                    </button>
                    <button className="px-3 py-1 text-sm rounded-full">
                      Notes
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button className="px-3 py-1.5 text-sm border rounded-md flex items-center gap-2">
                    <Search size={16} />
                    Search
                  </button>
                  <button className="px-3 py-1.5 text-sm rounded-md flex items-center gap-2 text-white" style={{ backgroundColor: 'var(--color-primary)' }}>
                    <Plus size={16} />
                    New Task
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Option 9: Icon + Text (RECOMMENDED) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-700">Option 9: Icon + Text (Work Sans)</h2>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">RECOMMENDED</span>
            </div>
            <div className="rounded-xl border shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex justify-between items-center px-5 py-3" style={{ borderBottom: '3px solid var(--color-primary)' }}>
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-primary)' }}>
                      <span className="text-white font-bold text-sm">M</span>
                    </div>
                    <h1 className="text-base font-semibold" style={{ fontFamily: '"Work Sans", sans-serif', color: 'var(--color-text)' }}>
                      Mise
                    </h1>
                  </div>
                  <div className="border-l pl-3" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="inline-flex items-center bg-gray-100 rounded-full p-1">
                      <button
                        className="px-3 py-1 text-sm rounded-full transition-all duration-200"
                        style={{ 
                          backgroundColor: 'var(--color-primary)',
                          color: 'white',
                          fontWeight: 600
                        }}
                      >
                        Tasks
                      </button>
                      <button className="px-3 py-1 text-sm rounded-full">
                        Notes
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button className="px-3 py-1.5 text-sm border rounded-md flex items-center gap-2">
                    <Search size={16} />
                    Search
                  </button>
                  <button className="px-3 py-1.5 text-sm rounded-md flex items-center gap-2 text-white" style={{ backgroundColor: 'var(--color-primary)' }}>
                    <Plus size={16} />
                    New Task
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Option 10: Subtle Right Corner */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-700">Option 10: Subtle Right Corner (Lato)</h2>
            <div className="rounded-xl border shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex justify-between items-center px-5 py-3 relative" style={{ borderBottom: '3px solid var(--color-primary)' }}>
                <div className="flex items-center gap-3 flex-1">
                  <div className="inline-flex items-center bg-gray-100 rounded-full p-1">
                    <button
                      className="px-3 py-1 text-sm rounded-full transition-all duration-200"
                      style={{ 
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        fontWeight: 600
                      }}
                    >
                      Tasks
                    </button>
                    <button className="px-3 py-1 text-sm rounded-full">
                      Notes
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button className="px-3 py-1.5 text-sm border rounded-md flex items-center gap-2">
                    <Search size={16} />
                    Search
                  </button>
                  <button className="px-3 py-1.5 text-sm rounded-md flex items-center gap-2 text-white" style={{ backgroundColor: 'var(--color-primary)' }}>
                    <Plus size={16} />
                    New Task
                  </button>
                </div>
                {/* Subtle logo in corner */}
                <div className="absolute -top-1 right-5">
                  <span className="text-xs font-light tracking-wide opacity-40" style={{ fontFamily: 'Lato, sans-serif', color: 'var(--color-text)' }}>
                    mise
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">Which one do you prefer?</h3>
          <p className="text-sm text-blue-800">
            Once you've decided, let me know the option number and I'll implement it in the main app!
          </p>
        </div>
      </div>

      {/* Load Google Fonts */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100;300;400;600;700&family=Playfair+Display:ital,wght@0,400;0,700;1,700&family=JetBrains+Mono:wght@700&family=Dancing+Script:wght@700&family=Montserrat:wght@900&family=Poppins:wght@600&family=Raleway:wght@600&family=Space+Grotesk:wght@700&family=Work+Sans:wght@600&family=Lato:wght@300&display=swap');
      `}</style>
    </div>
  );
}
