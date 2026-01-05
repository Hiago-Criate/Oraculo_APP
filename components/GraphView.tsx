import React, { useRef, useEffect } from 'react';
import { Project, Task, Note } from '../types';

interface GraphViewProps {
  project: Project;
  tasks: Task[];
  notes: Note[];
}

interface Node {
  id: string;
  type: 'center' | 'task' | 'note';
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  label?: string;
}

export const GraphView: React.FC<GraphViewProps> = ({ project, tasks, notes }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    nodesRef.current = []; 
  }, [project, tasks, notes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const initNodes = (width: number, height: number) => {
        if (nodesRef.current.length > 0) return;

        const centerX = width / 2;
        const centerY = height / 2;
        const newNodes: Node[] = [];

        newNodes.push({
          id: 'center',
          type: 'center',
          x: centerX,
          y: centerY,
          vx: 0,
          vy: 0,
          radius: 40,
          color: '#FF4500', 
          label: project.name
        });

        tasks.forEach((t) => {
          newNodes.push({
            id: `task-${t.id}`,
            type: 'task',
            x: centerX + (Math.random() - 0.5) * 300,
            y: centerY + (Math.random() - 0.5) * 300,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            radius: t.is_completed ? 6 : 8,
            color: t.is_completed ? '#22c55e' : '#FFFFFF', 
          });
        });

        notes.forEach((n) => {
          newNodes.push({
            id: `note-${n.id}`,
            type: 'note',
            x: centerX + (Math.random() - 0.5) * 300,
            y: centerY + (Math.random() - 0.5) * 300,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            radius: 10,
            color: '#A1A1AA',
          });
        });

        nodesRef.current = newNodes;
    };

    const animate = () => {
      if (!canvas || !container) return;
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      initNodes(width, height);

      ctx.clearRect(0, 0, width, height);
      const nodes = nodesRef.current;
      if (nodes.length === 0) return;

      const centerNode = nodes[0];

      const gravity = 0.005; 
      const friction = 0.94; 
      const repulsion = 200; 

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        
        if (node.type === 'center') {
            node.x += (centerX - node.x) * 0.05;
            node.y += (centerY - node.y) * 0.05;
            continue;
        }

        const dx = centerNode.x - node.x;
        const dy = centerNode.y - node.y;
        node.vx += dx * gravity;
        node.vy += dy * gravity;

        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue;
          const other = nodes[j];
          const rx = node.x - other.x;
          const ry = node.y - other.y;
          const distSq = rx * rx + ry * ry;
          const dist = Math.sqrt(distSq);
          
          if (dist > 0 && dist < 120) {
             const force = repulsion / (distSq + 0.1);
             node.vx += (rx / dist) * force;
             node.vy += (ry / dist) * force;
          }
        }

        node.vx *= friction;
        node.vy *= friction;
        node.x += node.vx;
        node.y += node.vy;

        const padding = 20;
        if (node.x < padding) node.vx += 0.5;
        if (node.x > width - padding) node.vx -= 0.5;
        if (node.y < padding) node.vy += 0.5;
        if (node.y > height - padding) node.vy -= 0.5;
      }

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(39, 39, 42, 0.3)';
      ctx.lineWidth = 1;
      for (let i = 1; i < nodes.length; i++) {
        ctx.moveTo(centerNode.x, centerNode.y);
        ctx.lineTo(nodes[i].x, nodes[i].y);
      }
      ctx.stroke();

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        
        ctx.beginPath();
        if (node.type === 'note') {
            ctx.rect(node.x - node.radius, node.y - node.radius, node.radius * 2, node.radius * 2);
        } else {
            ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        }
        
        ctx.fillStyle = node.color;
        
        if (node.type === 'center') {
            ctx.shadowBlur = 25;
            ctx.shadowColor = 'rgba(255, 69, 0, 0.4)';
        } else {
            ctx.shadowBlur = 0;
        }
        
        ctx.fill();
        ctx.shadowBlur = 0;

        if (node.type === 'center' && node.label) {
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 14px Inter';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(node.label, node.x, node.y);
        }
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
            const { width, height } = entry.contentRect;
            canvas.width = width;
            canvas.height = height;
        }
    });

    resizeObserver.observe(container);

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      resizeObserver.disconnect();
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [project, tasks, notes]);

  return (
    <div ref={containerRef} className="w-full h-full bg-[#050505] relative overflow-hidden rounded-xl border border-surfaceBorder shadow-inner cursor-crosshair">
      <div className="absolute top-4 left-4 pointer-events-none z-10 select-none">
        <h3 className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Visualization</h3>
      </div>
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};