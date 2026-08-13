'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label, PageHeader, Select } from '@bcl/ui';
import { api } from '@/lib/api';
import { Plus, Trash2 } from 'lucide-react';

type MenuItem = { id?: string; label: string; href: string; sortOrder: number };
type Menu = { id: string; location: string; items: MenuItem[] };

export default function CmsMenusPage() {
  const qc = useQueryClient();
  const menus = useQuery({
    queryKey: ['cms-menus'],
    queryFn: () => api.get<Menu[]>('/cms/menus'),
  });
  const [location, setLocation] = useState('HEADER');
  const [items, setItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    const menu = (menus.data || []).find((m) => m.location === location);
    setItems(
      (menu?.items || []).map((i, idx) => ({
        label: i.label,
        href: i.href,
        sortOrder: i.sortOrder ?? idx,
      })),
    );
  }, [menus.data, location]);

  const save = useMutation({
    mutationFn: () =>
      api.put('/cms/menus', {
        location,
        items: items.map((item, i) => ({ ...item, sortOrder: i })),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms-menus'] }),
  });

  return (
    <div>
      <PageHeader
        title="Menus"
        description="Header, footer, and mobile navigation"
        actions={
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save menu'}
          </Button>
        }
      />
      <div className="mb-4 max-w-xs">
        <Label>Menu location</Label>
        <Select value={location} onChange={(e) => setLocation(e.target.value)}>
          <option value="HEADER">Header</option>
          <option value="FOOTER">Footer</option>
          <option value="MOBILE">Mobile</option>
        </Select>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="cms-panel grid gap-2 p-3 sm:grid-cols-[1fr_1fr_auto]">
            <div>
              <Label>Label</Label>
              <Input
                value={item.label}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], label: e.target.value };
                  setItems(next);
                }}
              />
            </div>
            <div>
              <Label>Link</Label>
              <Input
                value={item.href}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], href: e.target.value };
                  setItems(next);
                }}
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                className="rounded-lg border p-2 text-red-600"
                onClick={() => setItems(items.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--bcl-burgundy)]"
        onClick={() => setItems([...items, { label: 'New link', href: '#', sortOrder: items.length }])}
      >
        <Plus className="h-4 w-4" /> Add item
      </button>
    </div>
  );
}
