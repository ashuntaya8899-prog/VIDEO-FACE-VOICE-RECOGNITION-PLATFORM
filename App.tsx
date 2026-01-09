import React, { useState } from 'react';
import { VideoRecord, MatchResult, AppView } from './types';
import { analyzeVideoContent, compareProfiles } from './services/geminiService';
import { VideoUploader } from './components/VideoUploader';
import { VideoPlayer } from './components/VideoPlayer';
import { SubtitleTable } from './components/SubtitleTable';

export default function App() {
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [currentView, setCurrentView] = useState<AppView>(AppView.UPLOAD);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  // Load from upload
  const handleUpload = async (files: File[]) => {
    const newRecords: VideoRecord[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      videoUrl: URL.createObjectURL(file),
      fileName: file.name,
      uploadTime: Date.now(),
      status: 'pending',
      matches: []
    }));

    setVideos(prev => [...prev, ...newRecords]);
    
    setCurrentView(AppView.LIBRARY);

    // Process each video
    for (const record of newRecords) {
      await processVideo(record.id, record.file);
    }
  };

  const processVideo = async (videoId: string, file: File) => {
    setVideos(prev => prev.map(v => v.id === videoId ? { ...v, status: 'analyzing' } : v));

    try {
      const analysis = await analyzeVideoContent(file);
      
      setVideos(prev => {
        const updated = prev.map(v => v.id === videoId ? { 
          ...v, 
          status: 'completed', 
          analysis 
        } as VideoRecord : v);
        return updated;
      });

      setVideos(currentVideos => {
        const currentVideo = currentVideos.find(v => v.id === videoId);
        const otherVideos = currentVideos.filter(v => v.id !== videoId && v.status === 'completed');

        if (currentVideo && currentVideo.analysis) {
           matchVideoAgainstOthers(currentVideo, otherVideos);
        }
        return currentVideos;
      });

    } catch (error) {
      console.error(error);
      setVideos(prev => prev.map(v => v.id === videoId ? { ...v, status: 'error' } : v));
    }
  };

  const matchVideoAgainstOthers = async (sourceVideo: VideoRecord, targets: VideoRecord[]) => {
    if (!sourceVideo.analysis) return;

    const matches: MatchResult[] = [];

    for (const target of targets) {
      if (!target.analysis) continue;

      const result = await compareProfiles(
        { face: sourceVideo.analysis.faceDescription, voice: sourceVideo.analysis.voiceDescription },
        { face: target.analysis.faceDescription, voice: target.analysis.voiceDescription, name: target.fileName }
      );

      if (result) {
        matches.push({ 
            ...result, 
            targetVideoId: target.id,
            timestamp: target.uploadTime
        });
      }
    }

    // Sort: Highest similarity first
    matches.sort((a, b) => b.similarityPercentage - a.similarityPercentage);

    if (matches.length > 0) {
      setVideos(prev => prev.map(v => v.id === sourceVideo.id ? { ...v, matches } : v));
    }
  };

  const handleSelectVideo = (id: string) => {
    setSelectedVideoId(id);
    setCurrentView(AppView.ANALYSIS);
  };

  const getVideoById = (id: string) => videos.find(v => v.id === id);

  // --- Render Components ---

  const SidebarItem = ({ 
    view, 
    label, 
    icon, 
    disabled = false,
    count
  }: { 
    view: AppView, 
    label: string, 
    icon: React.ReactNode, 
    disabled?: boolean,
    count?: number
  }) => (
    <button
      onClick={() => !disabled && setCurrentView(view)}
      disabled={disabled}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all mb-1 ${
        currentView === view
          ? 'bg-blue-600 text-white shadow-md'
          : disabled
            ? 'text-slate-300 cursor-not-allowed'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="font-medium text-sm">{label}</span>
      </div>
      {count !== undefined && (
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
          currentView === view ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
        }`}>
          {count}
        </span>
      )}
    </button>
  );

  const renderLibrary = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Kho Video Đã Lưu</h2>
        <button 
          onClick={() => setCurrentView(AppView.UPLOAD)}
          className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
        >
          + Thêm Video Mới
        </button>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-32 bg-white rounded-2xl border border-slate-200 border-dashed">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-slate-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
          <p className="text-slate-500 mb-6">Chưa có video nào trong hệ thống.</p>
          <button 
            onClick={() => setCurrentView(AppView.UPLOAD)}
            className="text-blue-600 font-semibold hover:underline"
          >
            Tải lên ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {videos.map(video => (
            <div 
              key={video.id} 
              className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group"
              onClick={() => handleSelectVideo(video.id)}
            >
              <div className="relative aspect-video bg-black">
                <video src={video.videoUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                        <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                        </svg>
                    </div>
                </div>
                
                <div className="absolute top-2 right-2">
                    {video.status === 'analyzing' && (
                        <span className="bg-white/90 text-yellow-700 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                            <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Đang phân tích
                        </span>
                    )}
                    {video.status === 'completed' && (
                        <span className="bg-green-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">Đã hoàn tất</span>
                    )}
                    {video.status === 'error' && (
                        <span className="bg-red-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">Lỗi</span>
                    )}
                </div>
              </div>
              
              <div className="p-4">
                <h3 className="font-semibold text-slate-800 truncate mb-2" title={video.fileName}>
                    {video.fileName}
                </h3>
                
                <div className="flex items-center gap-2 mb-3">
                  {video.matches.length > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded">
                       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                        <path fillRule="evenodd" d="M16.403 12.652a3 3 0 0 0 0-5.304 3 3 0 0 0-3.75-3.651 5 5 0 0 0-5.305 0 3 3 0 0 0-3.751 3.651 3 3 0 0 0 0 5.305 3 3 0 0 0 3.75 3.651 5 5 0 0 0 5.305 0 3 3 0 0 0 3.751-3.651ZM10 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" clipRule="evenodd" />
                      </svg>
                      {video.matches.length} Trùng khớp
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-500 text-xs font-medium rounded">
                      Chưa có trùng khớp
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-400 border-t border-slate-100 pt-3 flex justify-between">
                    <span>{new Date(video.uploadTime).toLocaleDateString('vi-VN')}</span>
                    <span>{new Date(video.uploadTime).toLocaleTimeString('vi-VN')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderAnalysis = () => {
    const video = videos.find(v => v.id === selectedVideoId);
    if (!video) return null;

    return (
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-1">Kết quả Phân tích Video</h2>
                <p className="text-slate-500 text-sm">Tệp: {video.fileName}</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${video.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {video.status === 'completed' ? 'Đã hoàn tất phân tích' : 'Đang xử lý dữ liệu...'}
            </div>
        </div>

        {/* TOP SECTION: Source Video + Subtitles (Side by Side) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* 1. Source Video Player */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
                <div className="bg-blue-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-600">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                        </svg>
                        <h3 className="font-bold text-blue-900">Video Mới Tải Lên</h3>
                    </div>
                </div>
                <div className="p-6 flex-1 flex items-center justify-center">
                    <VideoPlayer videoUrl={video.videoUrl} />
                </div>
            </section>

             {/* 2. Subtitles Table */}
             <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full" style={{ maxHeight: 'calc(100vw / 2 * 1.02)' }}>
                {/* Note: maxHeight is approximate to keep alignment, but SubtitleTable handles internal scrolling */}
                <SubtitleTable subtitles={video.analysis?.subtitles || []} />
             </section>
        </div>

        {/* BOTTOM SECTION: Matched Videos Comparison */}
        <section className="mt-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">So Sánh Video Trùng Khớp ({video.matches.length})</h2>
                    <p className="text-sm text-slate-500">So sánh song song video mới với các hồ sơ đã có trong kho dữ liệu</p>
                </div>
            </div>
            
            {video.matches.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {video.matches.map((match, idx) => {
                        const targetVideo = getVideoById(match.targetVideoId);
                        if (!targetVideo) return null;

                        return (
                            <div key={idx} className="bg-white rounded-2xl shadow-md border border-indigo-100 overflow-hidden flex flex-col">
                                <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100 flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                             <span className="text-[10px] font-bold text-white bg-indigo-600 px-2 py-0.5 rounded uppercase tracking-wide">
                                                {match.matchType} Match
                                             </span>
                                            <span className="text-indigo-900 font-bold truncate max-w-[200px]">{match.targetVideoName}</span>
                                        </div>
                                        <div className="text-xs text-indigo-700 flex items-center gap-2">
                                            <span>Đăng tải: {new Date(match.timestamp).toLocaleDateString('vi-VN')}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-2xl font-bold text-indigo-600">{match.similarityPercentage}%</span>
                                        <span className="text-[10px] uppercase text-indigo-400 font-bold">Tương đồng</span>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <VideoPlayer videoUrl={targetVideo.videoUrl} />
                                    <div className="mt-4 p-3 bg-slate-50 rounded border border-slate-100 text-sm text-slate-600">
                                        <span className="font-semibold text-slate-700">Lý do:</span> {match.reason}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center text-slate-500">
                    Không tìm thấy video trùng khớp nào.
                </div>
            )}
        </section>

        {/* Analysis Details (Face/Voice Text) */}
        <section className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-purple-600">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                <h3 className="font-semibold text-slate-800">Chi tiết Phân tích Sinh trắc học</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {video.analysis ? (
                    <>
                        <div>
                            <h4 className="flex items-center gap-2 font-bold text-slate-700 mb-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                Nhận diện Khuôn mặt (Face)
                            </h4>
                            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 leading-relaxed border border-slate-100 h-full">
                                {video.analysis.faceDescription}
                            </div>
                        </div>
                        <div>
                            <h4 className="flex items-center gap-2 font-bold text-slate-700 mb-2">
                                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                Nhận diện Giọng nói (Voice)
                            </h4>
                            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 leading-relaxed border border-slate-100 h-full">
                                {video.analysis.voiceDescription}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="col-span-2 text-center py-4 text-slate-400">Đang chờ kết quả phân tích...</div>
                )}
            </div>
        </section>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-inter">
        
        {/* SIDEBAR */}
        <aside className="w-64 bg-white border-r border-slate-200 h-screen fixed left-0 top-0 z-50 flex flex-col shadow-lg">
            <div className="h-16 flex items-center px-6 border-b border-slate-100">
                 <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white mr-3 shadow-blue-200 shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                    </svg>
                </div>
                <h1 className="font-bold text-lg text-slate-800 tracking-tight">VideoIdentity<span className="text-blue-600">AI</span></h1>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2 mt-4">Danh mục chính</div>
                
                <SidebarItem 
                    view={AppView.UPLOAD} 
                    label="Tải lên Video" 
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                        </svg>
                    }
                />

                <SidebarItem 
                    view={AppView.LIBRARY} 
                    label="Kho Video Đã Lưu" 
                    count={videos.length}
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3.251l00 .005m0-3.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5V4.5a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v3M6 7.5h12" />
                        </svg>
                    }
                />

                <div className="border-t border-slate-100 my-4 mx-2"></div>
                
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2">Phân tích & Báo cáo</div>

                <SidebarItem 
                    view={AppView.ANALYSIS} 
                    label="Kết quả Phân tích" 
                    disabled={!selectedVideoId}
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
                        </svg>
                    }
                />
            </nav>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold">AD</div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-medium text-slate-700 truncate">Quản trị viên</p>
                        <p className="text-xs text-slate-400 truncate">admin@system.vn</p>
                    </div>
                </div>
            </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 ml-64 p-8 min-h-screen">
            {currentView === AppView.UPLOAD && (
                <div className="max-w-3xl mx-auto pt-10">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Tải lên Video Mới</h2>
                    <p className="text-slate-500 mb-8">Kéo thả video vào khung bên dưới để bắt đầu tự động phân tích và nhập liệu vào kho dữ liệu.</p>
                    <VideoUploader onUpload={handleUpload} />
                </div>
            )}

            {currentView === AppView.LIBRARY && renderLibrary()}

            {currentView === AppView.ANALYSIS && renderAnalysis()}
        </main>
    </div>
  );
}