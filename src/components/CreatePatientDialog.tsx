import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

export default function CreatePatientDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [sex, setSex] = useState('');
  const [mrn, setMrn] = useState('');
  const [conditionInput, setConditionInput] = useState('');
  const [conditions, setConditions] = useState<string[]>([]);

  const reset = () => {
    setDisplayName('');
    setBirthDate('');
    setSex('');
    setMrn('');
    setConditionInput('');
    setConditions([]);
  };

  const addCondition = () => {
    const trimmed = conditionInput.trim();
    if (trimmed && !conditions.includes(trimmed)) {
      setConditions(prev => [...prev, trimmed]);
      setConditionInput('');
    }
  };

  const removeCondition = (index: number) => {
    setConditions(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    setSubmitting(true);
    try {
      const age = birthDate
        ? Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null;

      const { error } = await supabase.from('patients').insert({
        display_name: displayName.trim(),
        birth_date: birthDate || null,
        sex: sex || null,
        mrn: mrn.trim() || null,
        is_synthetic: false,
        primary_conditions: conditions.map(c => ({ display: c })),
        summary: age !== null ? { age: `${age}` } : {},
      });

      if (error) throw error;

      toast.success('Patient created');
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      reset();
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to create patient');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 rounded-xl">
          <Plus className="h-3.5 w-3.5" /> Add Patient
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Patient</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="displayName">Full Name *</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="e.g. Jane Doe"
              maxLength={100}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="birthDate">Date of Birth</Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sex</Label>
              <Select value={sex} onValueChange={setSex}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mrn">MRN</Label>
            <Input
              id="mrn"
              value={mrn}
              onChange={e => setMrn(e.target.value)}
              placeholder="e.g. MRN-1234567"
              maxLength={50}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Conditions</Label>
            <div className="flex gap-2">
              <Input
                value={conditionInput}
                onChange={e => setConditionInput(e.target.value)}
                placeholder="e.g. Type 2 diabetes"
                maxLength={100}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCondition(); } }}
              />
              <Button type="button" variant="secondary" size="sm" onClick={addCondition} className="shrink-0">
                Add
              </Button>
            </div>
            {conditions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {conditions.map((c, i) => (
                  <span key={i} className="status-chip bg-secondary text-secondary-foreground text-[11px] gap-1 pr-1">
                    {c}
                    <button type="button" onClick={() => removeCondition(i)} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <Button type="submit" disabled={submitting || !displayName.trim()} className="w-full gap-2 brand-gradient-bg border-0 text-white hover:opacity-90 rounded-xl">
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : 'Create Patient'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
