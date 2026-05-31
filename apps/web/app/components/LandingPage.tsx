'use client';

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold gradient-text">MintMusic</h1>
          <div className="flex items-center gap-8">
            <a href="#about" className="text-gray-400 hover:text-white transition-colors text-sm">About</a>
            <a href="#features" className="text-gray-400 hover:text-white transition-colors text-sm">Features</a>
            <a href="#creators" className="text-gray-400 hover:text-white transition-colors text-sm">For Creators</a>
            <Link
              href="/login"
              className="bg-green-500 hover:bg-green-400 text-black font-bold px-6 py-2 rounded-full transition-all hover:scale-105"
            >
              Sign in
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center relative pt-20">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-green-900/20"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
          <span className="inline-block text-green-400 text-sm font-bold tracking-widest uppercase mb-4 animate-fade-in">The Future of Music Ownership</span>
          <h1 className="text-6xl md:text-8xl font-black mb-6 leading-tight animate-fade-in-up">
            Own Your <span className="gradient-text">Sound</span>
          </h1>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto animate-fade-in-up stagger-2">
            MintMusic connects artists directly with fans through blockchain-verified ownership. No middlemen. No streaming royalties. Just pure, direct support.
          </p>
          <div className="flex gap-4 justify-center animate-fade-in-up stagger-3">
            <Link
              href="/login"
              className="bg-green-500 hover:bg-green-400 text-black font-bold px-8 py-4 rounded-full transition-all hover:scale-105 animate-pulse-glow"
            >
              Start Collecting
            </Link>
            <a 
              href="#about"
              className="border border-gray-600 hover:border-white text-white font-bold px-8 py-4 rounded-full transition-all hover:bg-white/10"
            >
              Learn More
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-float">
          <div className="w-6 h-10 border-2 border-gray-600 rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-3 bg-gray-600 rounded-full animate-bounce"></div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-green-400 text-sm font-bold tracking-widest uppercase mb-4 block">About MintMusic</span>
              <h2 className="text-5xl font-bold mb-6">Music Ownership, <span className="gradient-text">Reimagined</span></h2>
              <p className="text-gray-400 text-lg mb-6 leading-relaxed">
                For too long, streaming platforms have taken the lion's share while artists struggle to make ends meet. 
                MintMusic flips the script by enabling direct-to-fan sales through blockchain technology.
              </p>
              <p className="text-gray-400 text-lg leading-relaxed">
                When you collect music on MintMusic, you're not just getting a file — you're owning a piece of art. 
                Limited editions, exclusive access, and real ownership that can't be revoked.
              </p>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-3xl bg-gradient-to-br from-green-500/20 to-purple-500/20 p-8 glass">
                <div className="grid grid-cols-2 gap-4 h-full">
                  <div className="bg-gray-800 rounded-2xl p-6 flex flex-col justify-between">
                    <span className="text-4xl">🎵</span>
                    <div>
                      <p className="text-3xl font-bold text-white">100%</p>
                      <p className="text-gray-400 text-sm">Direct to Artist</p>
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-2xl p-6 flex flex-col justify-between">
                    <span className="text-4xl">⛓️</span>
                    <div>
                      <p className="text-3xl font-bold text-white">On-Chain</p>
                      <p className="text-gray-400 text-sm">Verified Ownership</p>
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-2xl p-6 flex flex-col justify-between">
                    <span className="text-4xl">💎</span>
                    <div>
                      <p className="text-3xl font-bold text-white">Limited</p>
                      <p className="text-gray-400 text-sm">Edition Releases</p>
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-2xl p-6 flex flex-col justify-between">
                    <span className="text-4xl">🔄</span>
                    <div>
                      <p className="text-3xl font-bold text-white">10%</p>
                      <p className="text-gray-400 text-sm">Resale Royalties</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 px-6 bg-gray-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-green-400 text-sm font-bold tracking-widest uppercase mb-4 block">Platform Features</span>
            <h2 className="text-5xl font-bold">Everything You Need</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 hover:border-green-500/50 transition-all group">
              <div className="w-14 h-14 bg-green-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-green-500/20 transition-colors">
                <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Instant Payments</h3>
              <p className="text-gray-400">Revenue settles directly to your wallet the moment a fan purchases. No waiting, no platform cuts.</p>
            </div>
            
            <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 hover:border-green-500/50 transition-all group">
              <div className="w-14 h-14 bg-green-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-green-500/20 transition-colors">
                <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Direct Fan Connection</h3>
              <p className="text-gray-400">Token-gated forums and messaging let you build real relationships with your most dedicated supporters.</p>
            </div>
            
            <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 hover:border-green-500/50 transition-all group">
              <div className="w-14 h-14 bg-green-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-green-500/20 transition-colors">
                <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Real Analytics</h3>
              <p className="text-gray-400">See who's collecting, where they are, and how your music spreads—all in real-time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* For Creators Section */}
      <section id="creators" className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-br from-green-900/30 to-purple-900/30 rounded-3xl p-12 md:p-16 glass relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-green-500/5 to-transparent"></div>
            
            <div className="relative z-10 max-w-2xl">
              <span className="text-green-400 text-sm font-bold tracking-widest uppercase mb-4 block">For Creators</span>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Get Paid What You Deserve</h2>
              <p className="text-gray-300 text-lg mb-8 leading-relaxed">
                Traditional streaming pays fractions of a cent per play. With MintMusic, a single collector can pay more 
                than thousands of streams ever would. Set your price, control your supply, and build a sustainable career.
              </p>
              
              <div className="space-y-4 mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-gray-200">Set your own prices—no algorithms dictating your worth</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-gray-200">Earn 10% royalties on every secondary sale, forever</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-gray-200">Create scarcity with limited edition drops</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-gray-200">Know exactly who your biggest supporters are</p>
                </div>
              </div>
              
              <Link
                href="/creator/apply"
                className="inline-block bg-white hover:bg-green-400 text-black font-bold px-8 py-4 rounded-full transition-all hover:scale-105"
              >
                Apply as Creator
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-bold mb-6">Ready to <span className="gradient-text">Mint</span>?</h2>
          <p className="text-xl text-gray-400 mb-10">
            Join the revolution in music ownership. Whether you're an artist or a collector, 
            the future of sound starts here.
          </p>
          <Link
            href="/login"
            className="inline-block bg-green-500 hover:bg-green-400 text-black font-bold px-12 py-5 rounded-full text-lg transition-all hover:scale-105 animate-pulse-glow"
          >
            Enter MintMusic
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-gray-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-gray-500">© 2024 MintMusic. Decentralized Music Platform.</p>
          <div className="flex gap-6 text-gray-500">
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
            <a href="#" className="hover:text-white transition-colors">Discord</a>
            <a href="#" className="hover:text-white transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

