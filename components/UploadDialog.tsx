"use client";

import * as React from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  // Optional preset vehicle ID for the upload
  vehicleId?: string;
  onUploaded?: () => void; // callback after successful upload
};

export default function UploadDialog({ vehicleId = "", onUploaded }: Props) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [vid, setVid] = React.useState(vehicleId);
  const [docType, setDocType] = React.useState("");
  const [expiry, setExpiry] = React.useState("");
  const [notes, setNotes] = React.useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !vid || !docType) {
      toast("Select a file, vehicle, and document type.");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("filename", file.name);
      fd.append("vehicleId", vid);
      fd.append("docType", docType);
      if (expiry) fd.append("expiry", expiry);
      if (notes) fd.append("notes", notes);

      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Upload failed");

      toast("Document uploaded");
      setOpen(false);
      setFile(null);
      setDocType("");
      setExpiry("");
      setNotes("");
      onUploaded?.();
    } catch (err: any) {
      toast(`Upload failed: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Upload document</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload a document</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Vehicle ID */}
          <div className="grid gap-1">
            <label className="text-sm text-slate-600">Vehicle ID / Unit #</label>
            <input
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
              placeholder="e.g. TRK-102"
              value={vid}
              onChange={(e) => setVid(e.target.value)}
              required
            />
          </div>

          {/* Document type */}
          <div className="grid gap-1">
            <label className="text-sm text-slate-600">Document type</label>
            <input
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
              placeholder="e.g. Insurance, Registration, Inspection, IFTA…"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              required
            />
          </div>

          {/* Expiry */}
          <div className="grid gap-1">
            <label className="text-sm text-slate-600">Expiry date (optional)</label>
            <input
              type="date"
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
          </div>

          {/* File */}
          <div className="grid gap-1">
            <label className="text-sm text-slate-600">File</label>
            <input
              type="file"
              className="w-full"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
            />
          </div>

          {/* Notes */}
          <div className="grid gap-1">
            <label className="text-sm text-slate-600">Notes (optional)</label>
            <textarea
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything helpful for audits…"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Uploading…" : "Upload"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}