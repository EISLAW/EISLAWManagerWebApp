import { Trash2, ExternalLink, Folder, FileText, File, Mail } from 'lucide-react';
import { motion } from 'motion/react';

interface Asset {
  id: string;
  type: 'folder' | 'file' | 'link' | 'email';
  name: string;
  url?: string;
  fileType?: string;
  emailFrom?: string;
  emailSubject?: string;
}

interface AssetItemProps {
  asset: Asset;
  onDelete: (id: string) => void;
}

export function AssetItem({ asset, onDelete }: AssetItemProps) {
  const getIcon = () => {
    switch (asset.type) {
      case 'folder':
        return <Folder className="w-5 h-5 text-yellow-600" />;
      case 'link':
        return <ExternalLink className="w-5 h-5 text-blue-600" />;
      case 'email':
        return <Mail className="w-5 h-5 text-purple-600" />;
      case 'file':
        if (asset.fileType === 'pdf') {
          return <FileText className="w-5 h-5 text-red-600" />;
        } else if (asset.fileType === 'xlsx' || asset.fileType === 'xls') {
          return <FileText className="w-5 h-5 text-green-600" />;
        } else if (asset.fileType === 'docx' || asset.fileType === 'doc') {
          return <FileText className="w-5 h-5 text-blue-600" />;
        }
        return <File className="w-5 h-5 text-slate-600" />;
      default:
        return <File className="w-5 h-5 text-slate-600" />;
    }
  };

  const getFileTypeLabel = () => {
    if (asset.type === 'folder') return 'תיקייה';
    if (asset.type === 'link') return 'קישור';
    if (asset.type === 'email') return 'אימייל';
    return asset.fileType?.toUpperCase() || 'קובץ';
  };

  const handleOpenInOutlook = (e: React.MouseEvent) => {
    e.stopPropagation();
    // In a real implementation, this would open the email in Outlook
    // Using mailto or Outlook protocol handler
    if (asset.emailSubject && asset.emailFrom) {
      // This is a stub - in real app would open Outlook with the specific email
      console.log('Opening email in Outlook:', {
        from: asset.emailFrom,
        subject: asset.emailSubject
      });
      alert(`פתיחת אימייל מ-${asset.emailFrom} באאוטלוק`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="group flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:shadow-md hover:border-[#0B3B5A] transition-all cursor-pointer"
      data-testid="asset-row"
    >
      {/* Actions (far left in RTL) */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(asset.id);
          }}
          className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="מחק נכס"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        {asset.url && (
          <a
            href={asset.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#0B3B5A] hover:bg-[#0B3B5A]/10 p-1 rounded transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
            aria-label="פתח קישור"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
        {/* Open in Outlook button for email assets */}
        {asset.type === 'email' && (
          <button
            onClick={handleOpenInOutlook}
            className="text-[#0B3B5A] hover:bg-[#0B3B5A]/10 px-3 py-1 rounded transition-colors text-sm whitespace-nowrap min-h-[44px]"
            data-testid="open-in-outlook"
            aria-label="פתח באאוטלוק"
          >
            פתח באאוטלוק
          </button>
        )}
      </div>

      {/* Asset Info - Icon on the right, text on the left */}
      <div className="flex-1 min-w-0 flex items-center gap-3 justify-end">
        {/* Text content - aligned to left */}
        <div className="flex-1 min-w-0 text-left">
          <div className="text-slate-900 truncate">{asset.name}</div>
          <div className="text-slate-500 text-xs">{getFileTypeLabel()}</div>
          {asset.type === 'email' && asset.emailFrom && (
            <div className="text-slate-400 text-xs">{asset.emailFrom}</div>
          )}
        </div>
        
        {/* Icon - aligned to the right */}
        <div className="flex-shrink-0">{getIcon()}</div>
      </div>
    </motion.div>
  );
}