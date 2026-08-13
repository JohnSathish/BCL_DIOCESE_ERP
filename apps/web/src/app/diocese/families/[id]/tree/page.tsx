'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, CardContent, PageHeader } from '@bcl/ui';
import { api } from '@/lib/api';

export default function FamilyTreePage() {
  const params = useParams<{ id: string }>();
  const tree = useQuery({
    queryKey: ['family-tree', params.id],
    queryFn: () =>
      api.get<{
        nodes: Array<{
          id: string;
          label: string;
          memberCode: string;
          isHead?: boolean;
          position: { x: number; y: number };
        }>;
        edges: Array<{ id: string; source: string; target: string; label: string }>;
      }>(`/family-tree/family/${params.id}`),
  });

  const nodes = (tree.data?.nodes || []).map((n) => ({
    id: n.id,
    position: n.position,
    data: { label: `${n.label}${n.isHead ? ' ★' : ''}\n${n.memberCode}` },
    style: {
      border: '1px solid #722f37',
      borderRadius: 12,
      padding: 10,
      background: '#fff',
      fontSize: 12,
      whiteSpace: 'pre-line' as const,
      width: 160,
    },
  }));

  const edges = (tree.data?.edges || []).map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    markerEnd: { type: MarkerType.ArrowClosed },
  }));

  return (
    <div>
      <PageHeader
        title="Family tree"
        description="Clickable relationship graph for this household"
      />
      <Card>
        <CardContent className="h-[560px] p-0">
          {tree.isLoading ? (
            <p className="p-6 text-sm text-[var(--bcl-muted)]">Loading graph…</p>
          ) : (
            <ReactFlow nodes={nodes} edges={edges} fitView>
              <Background />
              <Controls />
              <MiniMap />
            </ReactFlow>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
