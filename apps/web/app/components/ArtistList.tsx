import Image from 'next/image';

interface Artist {
  id: number;
  name: string;
  image: string;
  followed: boolean;
}

const MOCK_ARTISTS: Artist[] = [
  { id: 1, name: "Neon Pulse", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop", followed: true },
  { id: 2, name: "Cyber Soul", image: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=200&h=200&fit=crop", followed: true },
  { id: 3, name: "Luna Ray", image: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=200&h=200&fit=crop", followed: true },
  { id: 4, name: "Techno Bunker", image: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=200&h=200&fit=crop", followed: false },
];

const NEW_ARTISTS: Artist[] = [
  { id: 5, name: "Vox Machine", image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop", followed: false },
  { id: 6, name: "Crystal Waves", image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop", followed: false },
  { id: 7, name: "Midnight Echo", image: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=200&h=200&fit=crop", followed: false },
  { id: 8, name: "Bass Prophet", image: "https://images.unsplash.com/photo-1571974599782-87624638275e?w=200&h=200&fit=crop", followed: false },
];

export default function ArtistList() {
  return (
    <div className="space-y-10">
      {/* Followed Artists */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Artists You Follow</h2>
          <button className="text-green-400 text-sm hover:underline">See All</button>
        </div>
        <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
          {MOCK_ARTISTS.filter(a => a.followed).map((artist) => (
            <div key={artist.id} className="flex flex-col items-center min-w-[100px] group cursor-pointer">
              <div className="w-20 h-20 rounded-full overflow-hidden mb-3 ring-2 ring-transparent group-hover:ring-green-500 transition-all shadow-lg">
                <Image 
                  src={artist.image} 
                  alt={artist.name} 
                  width={80} 
                  height={80} 
                  className="object-cover w-full h-full group-hover:scale-110 transition-transform"
                  unoptimized
                />
              </div>
              <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">{artist.name}</span>
            </div>
          ))}
          <div className="flex flex-col items-center min-w-[100px] justify-center group cursor-pointer">
            <div className="w-20 h-20 rounded-full bg-gray-800/50 flex items-center justify-center border-2 border-dashed border-gray-600 group-hover:border-green-500 group-hover:bg-green-500/10 transition-all">
              <svg className="w-6 h-6 text-gray-500 group-hover:text-green-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-500 mt-3 group-hover:text-white transition-colors">Discover</span>
          </div>
        </div>
      </section>

      {/* New Artists */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">New & Noteworthy</h2>
          <button className="text-green-400 text-sm hover:underline">See All</button>
        </div>
        <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
          {NEW_ARTISTS.map((artist) => (
            <div key={artist.id} className="flex flex-col items-center min-w-[100px] group cursor-pointer">
              <div className="w-20 h-20 rounded-full overflow-hidden mb-3 ring-2 ring-transparent group-hover:ring-green-500 transition-all shadow-lg relative">
                <Image 
                  src={artist.image} 
                  alt={artist.name} 
                  width={80} 
                  height={80} 
                  className="object-cover w-full h-full group-hover:scale-110 transition-transform"
                  unoptimized
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors"></div>
              </div>
              <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">{artist.name}</span>
              <span className="text-xs text-gray-500">New</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
