import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v && !loading) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {destructive && (
              <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle size={16} className="text-red-600" />
              </div>
            )}
            <DialogTitle className="text-base">{title}</DialogTitle>
          </div>
        </DialogHeader>
        {description && (
          <p className="text-sm text-gray-500 -mt-1 leading-relaxed">{description}</p>
        )}
        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            disabled={loading}
            onClick={onConfirm}
            className={
              destructive
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-brand-navy hover:bg-brand-navy/90 text-white'
            }
          >
            {loading ? 'Aguarde...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
