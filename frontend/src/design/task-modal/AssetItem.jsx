import React from 'react';
import { Folder, FileText, Link as LinkIcon, Mail } from 'lucide-react';

const iconFor = (type, fileType) => {
  if (type === 'folder') return <Folder className="w-5 h-5 text-yellow-600" />;
  if (type === 'link') return <LinkIcon className="w-5 h-5 text-blue-600" />;
  if (type === 'email') return <Mail className="w-5 h-5 text-purple-600" />;
  if (fileType === 'pdf') return <FileText className="w-5 h-5 text-red-600" />;
  if (fileType === 'xlsx' || fileType === 'xls') return <FileText className="w-5 h-5 text-green-600" />;
  return <FileText className="w-5 h-5 text-petrol" />;
};

export default function AssetItem({ asset }) {
  return (
    <div className="group flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-petrol/40 transition-shadow shadow-sm"
      data-testid="tm.asset.row">
      <div className="flex-shrink-0">{iconFor(asset.type, asset.fileType)}</div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-slate-900 truncate">{asset.name}</div>
        <div className="text-xs text-slate-500 truncate">{asset.meta}</div>
        {asset.emailFrom && (
          <div className="text-xs text-slate-400 truncate">{asset.emailFrom}</div>
        )}
      </div>
      {asset.url && (
        <a
          href={asset.url}
          className="text-sm text-petrol underline"
          target="_blank"
          rel="noreferrer"
          data-testid="tm.asset.open"
        >
          פתח
        </a>
      )}
      {asset.type === 'email' && (
        <button
          className="px-3 py-1 rounded text-sm text-petrol border border-petrol/40 hover:bg-petrol/10"
          data-testid="tm.asset.email.open_outlook"
          data-action="email.open_in_outlook"
          data-asset-id={asset.id}
        >
          פתח באאוטלוק
        </button>
      )}
    </div>
  );
}

