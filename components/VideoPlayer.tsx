import React from 'react';

interface VideoPlayerProps {
  videoUrl: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoUrl }) => {
  return (
    <div className="flex flex-col items-center w-full h-full justify-center bg-black/5 rounded-lg">
      <div 
        className="relative bg-black rounded-lg overflow-hidden shadow-md border border-slate-300"
        style={{
            // Constraint: 1080x1020 resolution display frame.
            width: '100%',
            aspectRatio: '1080 / 1020' 
        }}
      >
        <video 
          src={videoUrl} 
          controls 
          className="w-full h-full object-contain"
          playsInline
        />
        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-1 rounded border border-white/20">
          Khung hình: 1080x1020
        </div>
      </div>
    </div>
  );
};
