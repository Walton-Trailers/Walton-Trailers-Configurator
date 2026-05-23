import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { LifeBuoy, Loader2 } from "lucide-react";

/**
 * Floating Help button (bottom-right) for logged-in dealers. Opens a small
 * dialog that POSTs to /api/dealer/help, which forwards to a Slack webhook
 * so the Walton dev team can triage. Captures the current URL automatically.
 *
 * Mount once at the page level. Hidden when no dealer session exists so it
 * doesn't appear in public flows.
 */
export function DealerHelpButton() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ subject: "", message: "" });

  const send = async () => {
    if (!form.message.trim()) return;
    setSubmitting(true);
    try {
      await apiRequest("/api/dealer/help", {
        method: "POST",
        body: {
          subject: form.subject.trim() || undefined,
          message: form.message.trim(),
          currentUrl: typeof window !== "undefined" ? window.location.href : undefined,
        },
      });
      toast({
        title: "Message sent",
        description: "Thanks — the Walton team has been notified.",
      });
      setForm({ subject: "", message: "" });
      setOpen(false);
    } catch (err: any) {
      toast({
        title: "Couldn't send",
        description: err?.message || "Try again, or email info@waltontrailers.com.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-3 shadow-lg transition-colors"
        title="Need help? Message the Walton team."
        aria-label="Help"
      >
        <LifeBuoy className="w-5 h-5" />
        <span className="hidden sm:inline text-sm font-medium">Help</span>
      </button>

      <Dialog open={open} onOpenChange={(next) => { if (!submitting) setOpen(next); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Send a message to the Walton team</DialogTitle>
            <DialogDescription>
              Something not working? Tell us what happened and we'll take a look.
              We see what page you're on automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="help-subject">Subject (optional)</Label>
              <Input
                id="help-subject"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="e.g. Can't save my BDE210 quote"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="help-message">What's going on? *</Label>
              <Textarea
                id="help-message"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Describe what you were doing and what went wrong. Include any error message you saw."
                rows={6}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={send} disabled={submitting || !form.message.trim()}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending…
                </>
              ) : (
                "Send"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
