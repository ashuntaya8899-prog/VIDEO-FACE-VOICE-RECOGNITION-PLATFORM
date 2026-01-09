import React, { useCallback } from 'react';

interface VideoUploaderProps {
  onUpload: (files: File[]) => void;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({ onUpload }) => {
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onUpload(Array.from(e.dataTransfer.files));
      }
    },
    [onUpload]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(Array.from(e.target.files));
    }
  };

  return (
    <div
      className="border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center hover:bg-slate-50 transition-colors cursor-pointer bg-white shadow-sm"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <input
        type="file"
        id="video-upload"
        className="hidden"
        accept="video/*"
        multiple
        onChange={handleChange}
      />
      <label htmlFor="video-upload" className="cursor-pointer flex flex-col items-center">
        <div className="bg-blue-50 p-4 rounded-full mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-blue-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
        </div>
        <h3 className="text-xl font-semibold text-slate-800 mb-2">Tải video lên</h3>
        <p className="text-slate-500 max-w-md mx-auto">
          Kéo thả hoặc nhấn vào đây để tải video. Hỗ trợ tải lên hàng loạt để tạo dữ liệu ban đầu.
        </p>
      </label>
    </div>
  );
};
