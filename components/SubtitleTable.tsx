import React from 'react';
import { Subtitle } from '../types';

interface SubtitleTableProps {
  subtitles: Subtitle[];
}

export const SubtitleTable: React.FC<SubtitleTableProps> = ({ subtitles }) => {
  if (!subtitles || subtitles.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50 rounded-lg border border-slate-200 text-slate-400">
        Chưa có dữ liệu phụ đề
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white rounded-lg shadow-md border border-slate-200">
      <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-between items-center sticky top-0 z-10">
        <h3 className="font-semibold text-slate-700">Phụ đề (Subtitles)</h3>
        <span className="text-xs font-medium px-2 py-1 bg-teal-100 text-teal-700 rounded-full">
          {subtitles.length} dòng
        </span>
      </div>
      
      <div className="overflow-y-auto flex-1 p-0 scrollbar-hide">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 sticky top-0 shadow-sm z-10">
            <tr>
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/2 border-r border-slate-100 bg-slate-50">
                Bangla (Phonetic)
              </th>
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/2 bg-slate-50">
                Tiếng Việt (Dịch nghĩa)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {subtitles.map((sub) => (
              <tr key={sub.id} className="hover:bg-teal-50 transition-colors">
                <td className="py-3 px-4 text-sm text-slate-700 border-r border-slate-100 font-medium align-top">
                  {sub.bengaliPhonetic}
                </td>
                <td className="py-3 px-4 text-sm text-slate-700 align-top">
                  {sub.vietnameseTranslation}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
